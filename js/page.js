var origin_data_url;

var tailors = {};


var Placer = {

	place: function (tailors) {



		var x = 0;

		for( var key in tailors ) {

			var tailor = tailors[ key ];

			tailor.align.x = x;

			tailor.align.y = 380 - tailor.boundingBox.height;

			x += Math.floor( tailor.boundingBox.width * 0.6 );
		}

	}

}

$('.input-upload').change(function(e){
	
	var file = e.target.files[0];

	var reader = new FileReader();
	reader.readAsDataURL( file );

	var _id = '#' + $(this).parents('.img-slot')[0].id;

	var uploadDiv = $(this).parent()[0];
	var _canvas = $( _id ).children('.img-canvas')[0];

	$( uploadDiv ).toggleClass('hide');
	$( _canvas ).toggleClass('hide');

	reader.onloadend = function (e) {

        origin_data_url = reader.result;

        var img = new Image();
        img.src = origin_data_url;

        img.onload = function() {

			var tailor = new Pictailor( _canvas, origin_data_url, this.width, this.height );

			tailors[ _id ] = tailor;

        }
	};

});

$('.cut-picture').click(function(){

	var _id = '#' + $(this).parents('.img-slot')[0].id;

	tailors[ _id ].process( 2 ).draw();

});


$('#btnComposite').click(function(){

	var pctx = compositeCanvas.getContext('2d');

	Placer.place( tailors );

	for( var i in tailors ) {

		var tailor = tailors[i];

		pctx.drawImage( tailor.img, tailor.align.x, tailor.align.y );

		// pctx.

	}

	// pctx.drawImage( tailors['#img_1'].img, 100, 0 );


});

























