
function geoChart() {
    function drawChart(world, svg, projectionName, animate) {
        var projection = d3.geo[projectionName]()
            .scale(170)
            .translate([svg.attr('width') / 2, svg.attr('height') / 2])
            .precision(.1)

        var projectionPath = d3.geo.path().projection(projection);
        var sphereSelection = svg.selectAll('defs').data(['defs']);

        sphereSelection.enter().append('defs').append('path');

        function anim(element) {
            return animate ? element.transition() : element;
        }

        sphereSelection.select('path')
            .datum({type: 'Sphere'})
            .attr('id', 'sphere')
            .attr('d', projectionPath);

        svg.selectAll('use').data(['use']).enter()
            .append('use')
            .attr('class', 'sphere')
            .attr('xlink:href', '#sphere');

        var graticule = d3.geo.graticule();

        var graticuleSelection = svg.selectAll('path.graticule').data([graticule])
        graticuleSelection.enter().append('path').attr('class', 'grid graticule');
        graticuleSelection.attr('d', projectionPath);

        var countrySelection =  svg.selectAll('.country')
            .data(topojson.feature(world, world.objects.countries).features)

        countrySelection.enter()
            .append('path')
            .attr('class', 'country');

        countrySelection.attr({
            id: function(d) {return 'country_' + d.properties.id;},
            d: projectionPath
        }).on('click', function(d) {
            var currentSelection = this;
            var country = d3.select(currentSelection);
            d3.select('#countryName').text(country.datum().properties.admin);
            d3.selectAll('.country').filter(function(c) {return this !== currentSelection}).classed('highlight', false);
            country.classed('highlight', !country.classed('highlight'));
        });
    }

    var world, svg, projection;
    var chart = function() {
        drawChart(world, svg, projection || 'eckert5');
    }
    chart.world = function(_world) { world = _world; return chart;}
    chart.svg = function(_svg) {svg = _svg; return chart;}
    chart.projection = function(_projection) { projection = _projection; return chart;}
    chart.drawChart = chart;
    return chart;
}

var worldData;
function init() {
    queue().defer(d3.json, 'world-topo.json')
        .await(processData);
    d3.select('#projection').on('change', function() {
        drawChart(worldData);
    });
}

function processData(error, data) {
    if(error) {console.error("ERROR proccessing data")}
    worldData = data;
    drawChart(worldData);
}
function drawChart(data) {
    geoChart().world(data).svg(d3.select('svg')).projection(d3.select('#projection').node().value).drawChart();
}

init();
