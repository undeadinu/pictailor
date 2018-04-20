const FILTER = 245;
const SAMPLING_AMOUNT = 4;

const C_WIDTH = 400;
const C_HEIGHT = 400;

var Pixel = function(R,G,B,A) {
	this.r = R;
	this.g = G;
	this.b = B;
	this.alpha = A;
}
Pixel.prototype = {
	isBlankPixel : function() {
		if( this.r>=FILTER && this.g>=FILTER && this.b>=FILTER ) {
			return true;
		}
	},
	isFFFPixel : function( threshold ) {
		var average = (( this.r + this.g + this.b )/3).toFixed(1)*10;
		if( average>threshold ) {
			return true;
		}	
	},
	calc_Color_Average : function() {
		return Math.floor( ( this.r+this.g+this.b )/3 );
	}
}

var Pictailor = function ( canvasId, imgsrc, width, height ) {

	var ctx;
	var canvas;

	this.img = new Image();
	this.img.src = imgsrc;
	this.imgData;
	this.pixels = [];

	this.boundingBox = {};

	this.align = { x: 0, y: 0 };

	this.init( canvasId, width, height );
}

Pictailor.prototype = {
	init : function (canvasId, img_width, img_height) {

		canvas = canvasId;

		ctx = canvasId.getContext('2d');

		ctx.fillStyle = '#ffffff';
		ctx.fillRect( 0, 0, C_WIDTH, C_HEIGHT );

		var width, height, left, top;

		if( img_width <= img_height ) {

			height = C_HEIGHT;

			width = height * ( img_width/img_height );

		}else{

			width = C_WIDTH;

			height = width * ( img_height/img_width );

		}


		left = C_WIDTH/2 - Math.floor( width/2 );
		top = C_HEIGHT/2 - Math.floor( height/2 );

		ctx.drawImage( this.img, 0, 0, img_width, img_height, left, top, width, height );

			
		transfer_data_url = canvasId.toDataURL();
		this.img.src = transfer_data_url;

	},

	process : function( level ) {
		ctx.clearRect( 0,0, C_WIDTH, C_HEIGHT );

		ctx.drawImage( this.img, 0, 0 );

		this.imgData = ctx.getImageData( 0, 0, C_WIDTH, C_HEIGHT );

		// generate pixel object, push into pixels array
		for( var i=0; i<this.imgData.data.length; i+=4 ) {
			var p = new Pixel( this.imgData.data[i], this.imgData.data[i+1], this.imgData.data[i+2], this.imgData.data[i+3] );
			this.pixels.push(p);
		}

		this.rayProcessing(this.pixels);

		if( level !== 1 ) {
			this.scanProcessing( level );
		}

		this.pixels2ImageData(this.pixels);

		return this;
	},

	// 从上下左右四个方向计算像素，遇到第一个非白像素停止
	// 该方法用来确定轮廓
	rayProcessing : function (pixels) {

		// 各个边界极值
		var b_left 		= C_WIDTH, 
			b_right 	= 0, 
			b_top 		= C_HEIGHT,
			b_bottom 	= 0,

			temp_left,
			temp_right,
			temp_top,
			temp_bottom;

		// 1. 左侧射线
		for( var row=0; row<C_HEIGHT; ++row ) {
			for( var i=0; i<C_WIDTH; ++i ) {
				var index = row*C_WIDTH+i;
				if( pixels[index].isBlankPixel() ) {
					pixels[index].alpha = 0;
				}else{
					pixels[index].alpha = 255 - pixels[index].calc_Color_Average();
					temp_left = i;
					break;
				}
			}

			if( b_left > temp_left ) {
				b_left = temp_left;
			}

		}

		// 2. 右侧射线
		for( var row2=0; row2<C_HEIGHT; ++row2 ) {
			for( var i2=C_WIDTH-1; i2>=0; --i2 ) {
				var index = row2*C_WIDTH+i2;
				if( pixels[index].isBlankPixel() ) {
					pixels[index].alpha = 0;
				}else{
					pixels[index].alpha = 255 - pixels[index].calc_Color_Average();
					temp_right = i2;
					break;
				}
			}

			if( b_right < temp_right ) {
				b_right = temp_right;
			}

		}

		// 3. 上方射线
		for( var col1=0; col1<C_WIDTH; ++col1 ) {
			for( var j1=0; j1<C_HEIGHT; ++j1 ) {
				var index = col1+j1*C_HEIGHT;
				if( pixels[index].isBlankPixel() ) {
					pixels[index].alpha = 0;
				}else{
					pixels[index].alpha = 255 - pixels[index].calc_Color_Average();
					temp_top = j1;
					break;
				}
			}

			if( b_top > temp_top ) {
				b_top = temp_top;
			}

		}

		// 4. 下方射线
		for( var col2=0; col2<C_WIDTH; ++col2 ) {
			for( var j2=C_HEIGHT-1; j2>=0; --j2 ) {
				var index = col2+j2*C_HEIGHT;
				if( pixels[index].isBlankPixel() ) {
					pixels[index].alpha = 0;
				}else{
					pixels[index].alpha = 255 - pixels[index].calc_Color_Average();
					temp_bottom = j2;
					break;
				}
			}

			if( b_bottom < temp_bottom ) {
				b_bottom = temp_bottom;
			}

		}


		// 
		this.boundingBox.left = b_left;
		this.boundingBox.right = b_right;
		this.boundingBox.top = b_top;
		this.boundingBox.bottom = b_bottom;
		this.boundingBox.width = this.boundingBox.right - this.boundingBox.left;
		this.boundingBox.height = this.boundingBox.bottom - this.boundingBox.top;
	},

	// 使用一个sample来扫描图像，符合sample特征的像素减去一部分透明度
	// 此方法用来去掉物体中空的部分
	scanProcessing : function( level ) {

		var factor;
		var threshold;

		if( level == 2 ) {
			factor = 64;
			threshold = 2450;
		}
		else if ( level == 3 ) {
			factor = 128;
			threshold = 2000;
		}

		var sampler = [
			{
				amount: 40,
				weight: factor,
				threshold: threshold
			},
			{
				amount: 36,
				weight: factor/2,
				threshold: threshold
			},
			{
				amount: 3,
				weight: factor/8,
				threshold: threshold
			}
		]

		for( var i=0; i<sampler.length; ++i ) {

			for( var h1=0; h1 < this.pixels.length-sampler[i].amount; ++h1 ) {

				if( this.isSampleWhite( 'h1', h1, sampler[i].amount, sampler[i].threshold ) ) {

					for( var n=0; n<sampler[i].amount; ++n ) {
						this.pixels[ h1 + n ].alpha -= sampler[i].weight;
					}

				}

			}

			for( var v1=0; v1 < this.pixels.length-sampler[i].weight-(sampler[i].weight*C_WIDTH); ++v1 ) {

				if( this.isSampleWhite( 'v1', v1, sampler[i].amount, sampler[i].threshold ) ) {

					for( var n=0; n<sampler[i].amount; ++n ) {
						if(  (v1 + n*C_WIDTH) >=this.pixels.length  ) {
							continue;
						}
						this.pixels[ v1 + n*C_WIDTH ].alpha -= sampler[i].weight;
					}

				}
			}

		}
	},
	isSampleWhite : function ( direction, start, amount, threshold ) {

		switch(direction) {

			case 'h1':
				for( var i=0; i<amount; ++i ) {
					if( !this.pixels[start+i].isFFFPixel(threshold) ) {
						return false;
					}
				}	
				break;

			case 'v1':
				for( var i=0; i<amount; ++i ) {
					if( (start+C_WIDTH*i)<this.pixels.length && !this.pixels[start+C_WIDTH*i].isFFFPixel(threshold) ) {
						return false;
					}
				}
				break;

		}	
		return true;
	},

	// 将像素数组转为imageData
	pixels2ImageData : function (pixels) {
		for( var i in pixels ) {
			this.imgData.data[i*4+3] = pixels[i].alpha;
		}
	},

	draw : function () {
		ctx.clearRect( 0, 0, C_WIDTH, C_HEIGHT );	
		ctx.putImageData( this.imgData, 0, 0 );	

		// 获取一个「真实」的商品图片，去掉四周空白的像素
		// 创建一个临时的画布，将商品图片画上去，然后取得img信息
		this.imgData = ctx.getImageData( this.boundingBox.left, this.boundingBox.top, this.boundingBox.width, this.boundingBox.height );	
		var tempcanvas = document.createElement('CANVAS');
		tempcanvas.width = this.boundingBox.width;
		tempcanvas.height = this.boundingBox.height;
		var tctx = tempcanvas.getContext('2d');
		tctx.putImageData( this.imgData, 0, 0 );
		var final_data_url = tempcanvas.toDataURL();
		this.img.src = final_data_url;

		// draw boundingBox
		ctx.strokeStyle = '#ff0000';
		ctx.strokeRect( this.boundingBox.left, this.boundingBox.top, this.boundingBox.right-this.boundingBox.left, this.boundingBox.bottom-this.boundingBox.top );
	}
}