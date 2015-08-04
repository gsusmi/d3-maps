function geoChart() {
    'use strict';

    var rotationAngles = [0, 0];
    var time = new Date;

    var projections = {
        baker: function() {return d3.geo.baker().scale(100)},
        aitoff: function() { return d3.geo.aitoff().scale(100); }
    }

    function rotateProjection(projection) {
        return projection.rotate(rotationAngles);
    }

    function createProjection(name) {
        return rotateProjection(projections[name] ? projections[name]() : d3.geo[name]().scale(170));
    }

    function drawChart(world, svg, projectionName, animate, oldProjectionName) {
        var width = svg.attr('width'),
            height = svg.attr('height');

        var animateProjection = (oldProjectionName && oldProjectionName !== projectionName);

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
            // Unrotated the projections before interpolating:
            oldProjection = oldProjection.rotate([0, 0]);
            newProjection = newProjection.rotate([0, 0]);
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

                var projection = rotateProjection(
                    d3.geo.projection(project)
                        .scale(1)
                        .translate([width / 2, height / 2]));

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
            if(!animate) {return selection.attr('d', projectionPath);}

            return animateProjection ? anim(selection).attrTween('d', projectionTween(oldProjection, projection))
                : anim(selection).attr('d', projectionPath);
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

        var circle = d3.geo.circle().angle(90);
        var night = svg.selectAll('path.night').data(function(d) {
            var value = circle.origin(antipode(solarPosition(time)))();
            value.time = time;
            return [value];
        });
        night.enter().append('path').attr('class', 'night');

        function nightTween(d) {
            var t = 0;
            var oldTime = d.oldTime || d3.time.hour.offset(d.time, -1),
                newTime = d.time;

            function path() {
                var currentTime = d3.time.second.offset(oldTime, ((newTime - oldTime) / 1000) * t);
                var currentPath = circle.origin(antipode(solarPosition(currentTime)))();
                return projectionPath(currentPath);
            }
            return function(tweenStep) {
                t = tweenStep;
                return path();
            }
        }

        animate ? night.transition().duration(1000).ease('linear').attrTween('d', nightTween) : night.attr('d', projectionPath).datum(function(d) {
            d.oldTime = d.time;
            return d;
        });
    }

    var world, svg, projection;
    var chart = function(animate, oldProjectionName) {
        drawChart(world, svg, projection || 'eckert5', animate, oldProjectionName);
    }
    chart.world = function(_world) { world = _world; return chart;}
    chart.svg = function(_svg) {svg = _svg; return chart;}
    chart.projection = function(_projection) { projection = _projection; return chart;}
    chart.rotate = function (_angle) { rotationAngles = _angle; return chart; }
    chart.time = function(_time) {time = _time; return chart;}
    chart.drawChart = chart;
    return chart;
}

var worldData, chartTime = new Date(), intervalId;
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

    d3.select('#day').on('click', function() {
        intervalId = setInterval(function() {
            chartTime = d3.time.hour.offset(chartTime, 1);
            drawChart(worldData, true);
        }, 1000);
    });

    d3.select('#reset').on('click', function() {
        clearInterval(intervalId);
        chartTime = new Date();
        drawChart(worldData, true);
    });
}
var oldProjectionName;
function drawChart(data, animate) {
    var projection = d3.select('#projection').node().value;
    geoChart().world(data).svg(d3.select('svg'))
        .time(chartTime)
        .projection(projection)
        .rotate([90, 0])
        .drawChart(animate, oldProjectionName);
    oldProjectionName = projection;
}

init();
