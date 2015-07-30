
function geoChart() {
    var projections = {
        'baker': function() {return d3.geo.baker().scale(100)}
    }

    function rotateProjection(projection, angle) {
        return projection.rotate([angle, 0]);
        // return projection;
    }

    function createProjection(name) {
        return rotateProjection(projections[name] ? projections[name]() : d3.geo[name]().scale(170), 90);
    }

    function drawChart(world, svg, projectionName, animate, oldProjectionName) {
        var width = svg.attr('width'),
            height = svg.attr('height');
        var projection = createProjection(projectionName)
            .translate([width / 2, height / 2])
            .precision(.1)

        var oldProjection;
        if(oldProjectionName) {
            oldProjection = createProjection(oldProjectionName)
                .translate([width/2, height/2])
                .precision(.1)
        }

        function anim(element) {
            return animate ? element.transition().duration(1000) : element;
        }

        function projectionTween(oldProjection, newProjection) {
            return function(d) {
                var t = 0;
                function toDegrees(radians) {
                    return radians * 180 / Math.PI;
                }

                function project(lat, lon) {
                    lat = toDegrees(lat);
                    lon = toDegrees(lon);

                    var p0 = oldProjection([lat, lon]),
                        p1 = newProjection([lat, lon]);

                    return [(1-t) * p0[0] + t * p1[0],
                            (1-t) * -p0[1] + t * -p1[1]];
                }

                var projection = d3.geo.projection(project)
                    .scale(1)
                    .translate([width / 2, height / 2]);

                var path = d3.geo.path().projection(projection);

                return function(tweenStep) {
                    t = tweenStep;
                    return path(d);
                }
            }
        }

        var projectionPath = d3.geo.path().projection(projection);
        var sphereSelection = svg.selectAll('defs').data(['defs']);

        sphereSelection.enter().append('defs').append('path');

        var spherePath = sphereSelection.select('path')
            .datum({type: 'Sphere'})
            .attr('id', 'sphere');

            window.oldProjection = oldProjection;
            window.projection = projection;
            window.projectionPath = projectionPath;

        function applyProjection(selection) {
            animate ? anim(selection).attrTween('d', projectionTween(oldProjection, projection))
                : selection.attr('d', projectionPath);
        }

        applyProjection(spherePath);

        svg.selectAll('use').data(['use']).enter()
            .append('use')
            .attr('class', 'sphere')
            .attr('xlink:href', '#sphere');

        var graticule = d3.geo.graticule();

        var graticuleSelection = svg.selectAll('path.graticule').data([graticule()])
        graticuleSelection.enter().append('path').attr('class', 'grid graticule');
        applyProjection(graticuleSelection);
        window.graticuleSelection = graticuleSelection;

        var countrySelection =  svg.selectAll('.country')
            .data(topojson.feature(world, world.objects.countries).features)

        countrySelection.enter()
            .append('path')
            .attr('class', 'country');

        countrySelection.attr({
            id: function(d) {return 'country_' + d.properties.id;},
        }).on('click', function(d) {
            var currentSelection = this;
            var country = d3.select(currentSelection);
            d3.select('#countryName').text(country.datum().properties.admin);
            d3.selectAll('.country').filter(function(c) {return this !== currentSelection}).classed('highlight', false);
            country.classed('highlight', !country.classed('highlight'));
        }).call(applyProjection);

        oldProjection = projection;
    }

    var world, svg, projection;
    var chart = function(animate, oldProjectionName) {
        drawChart(world, svg, projection || 'eckert5', animate, oldProjectionName);
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
        drawChart(worldData, true);
    });
}

function processData(error, data) {
    if(error) {console.error("ERROR proccessing data")}
    worldData = data;
    drawChart(worldData);
}
var oldProjectionName;
function drawChart(data, animate) {
    var projection = d3.select('#projection').node().value;
    geoChart().world(data).svg(d3.select('svg')).projection(projection).drawChart(animate, oldProjectionName);
    oldProjectionName = projection;
}

init();
