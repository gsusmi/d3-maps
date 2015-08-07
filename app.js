function geoChart() {
    'use strict';

    var rotationAngles = [0, 0];
    var time = new Date, previousTerminatorTime;

    var projections = {
        baker: function() {return d3.geo.baker().scale(100)},
        aitoff: function() { return d3.geo.aitoff().scale(130); }
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

        var circle = d3.geo.circle().angle(90);
        var night = svg.selectAll('path.night').data(function(d) {
            var value = circle.origin(antipode(solarPosition(time)))();
            value.time = time;
            return [value];
        });
        night.enter().append('path').attr('class', 'night');

        function wrapAngle(angle) {
            return angle > 0 ? angle + 360 : angle - 360;
        }

        function nightTween(d) {
            var t = 0;
            var oldTime = previousTerminatorTime,
                newTime = d.time;

            var newTimeAntipode = antipode(solarPosition(newTime)),
                oldTimeAntipode = antipode(solarPosition(oldTime));

            var deltaX = newTimeAntipode[0] - oldTimeAntipode[0],
                deltaY = newTimeAntipode[1] - oldTimeAntipode[1];

            if(Math.abs(deltaX) > 180) {newTimeAntipode[0] = wrapAngle(newTimeAntipode[0]);}
            if(Math.abs(deltaY) > 180) {newTimeAntipode[1] = wrapAngle(newTimeAntipode[1]);}

            function path() {
                var currentTimeAntipode = [
                    (oldTimeAntipode[0] * (1 - t)) + (newTimeAntipode[0] * t),
                    (oldTimeAntipode[1] * (1 - t)) + (newTimeAntipode[1] * t)
                ];
                var currentPath = circle.origin(currentTimeAntipode)();
                return projectionPath(currentPath);
            }
            return function(tweenStep) {
                t = tweenStep;
                return path();
            }
        }

        animate && previousTerminatorTime ? night.transition().duration(1000).ease('linear').attrTween('d', nightTween) : applyProjection(night);

        var timeLabel = svg.selectAll('text.time').data(['time']);
        timeLabel.enter().append('text').attr('class', 'time');
        timeLabel.attr({
            x: width - 160,
            dy: 20
        }).text(d3.time.format('%x %X %p')(time));
    }

    var world, svg, projection;
    var chart = function(animate, oldProjectionName) {
        drawChart(world, svg, projection || 'eckert5', animate, oldProjectionName);
    }
    chart.world = function(_world) { world = _world; return chart;}
    chart.svg = function(_svg) {svg = _svg; return chart;}
    chart.projection = function(_projection) { projection = _projection; return chart;}
    chart.rotate = function (_angle) { rotationAngles = _angle; return chart; }
    chart.time = function(_time, _previousTerminatorTime) {
        time = _time;
        previousTerminatorTime = _previousTerminatorTime;
        return chart;
    }
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

    var timeIncrement = incrementHour;

    function incrementHour(time) {
        return d3.time.hour.offset(time, 1);
    }

    function incrementDays(time) {
        return d3.time.hour.offset(time, 7 * 24);
    }

    function animateTerminator() {
        var oldChartTime = chartTime;
        chartTime = timeIncrement(chartTime);
        drawChart(worldData, true, oldChartTime);
    }

    d3.selectAll('#day, #fastAnimation').on('click', function() {
        if(intervalId) {return;}
        var animationId = d3.select(this).attr('id');
        timeIncrement = animationId === 'fastAnimation' ? incrementDays : incrementHour;

        animateTerminator();
        intervalId = setInterval(animateTerminator, 1000);
    });

    d3.select('#stop').on('click', function() {
        clearInterval(intervalId);
        intervalId = undefined;
    })

    d3.select('#reset').on('click', function() {
        clearInterval(intervalId);
        intervalId = undefined;
        var oldChartTime = chartTime;
        chartTime = new Date();
        oldChartTime = oldChartTime || chartTime;
        drawChart(worldData, true, oldChartTime);
    });


}
var oldProjectionName;
function drawChart(data, animate, previousTerminatorTime) {
    var projection = d3.select('#projection').node().value;
    geoChart().world(data).svg(d3.select('svg'))
        .time(chartTime, previousTerminatorTime)
        .projection(projection)
        .rotate([90, 0])
        .drawChart(animate, oldProjectionName);
    oldProjectionName = projection;
}

init();
