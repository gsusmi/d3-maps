function geoChart(world, svg) {
    var projection = d3.geo.eckert5()
        .scale(170)
        .translate([svg.attr('width') / 2, svg.attr('height') / 2])
        .precision(.1)

    var path = d3.geo.path().projection(projection);

    svg.append('defs').append('path')
        .datum({type: 'Sphere'})
        .attr('id', 'sphere')
        .attr('d', path);

    svg.append('use')
        .attr('class', 'sphere')
        .attr('xlink:href', '#sphere');

    var graticule = d3.geo.graticule();

    svg.append('path')
        .datum(graticule)
        .attr('class', 'grid')
        .attr('d', path);

    svg.selectAll('.country')
        .data(topojson.feature(world, world.objects.countries).features)
        .enter()
        .append('path')
        .attr({
            'class': 'country',
            id: function(d) {return 'country_' + d.properties.id;},
            d: path
        }).on('click', function(d) {
            var currentSelection = this;
            var country = d3.select(currentSelection);
            d3.select('#countryName').text(country.datum().properties.admin);
            d3.selectAll('.country').filter(function(c) {return this !== currentSelection}).classed('highlight', false);
            country.classed('highlight', !country.classed('highlight'));
        })

}

function init() {
    queue().defer(d3.json, 'world-topo.json')
        .await(processData);
}

function processData(error, data) {
    if(error) {console.error("ERROR proccessing data")}
    geoChart(data, d3.select('svg'));
}

init();
