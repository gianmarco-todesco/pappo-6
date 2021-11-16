let circle, line;

window.addEventListener('DOMContentLoaded', () => {
    var s = Snap("#svg");
    circle = s.circle(150, 150, 100);
    // By default its black, lets change its attributes
    circle.attr({
        fill: "#bada55",
        stroke: "#000",
        strokeWidth: 5
    });

    line = s.line(10,10,150,150);
    line.attr({
        stroke: "#000",
        strokeWidth: 5
    });

    circle.drag((dx,dy,x,y,e) => {
        circle.attr('cx',''+x);
        
        
    })
});
