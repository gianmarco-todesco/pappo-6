
let snap;
let bounds;
let pA,pB,pC,pD,pE,pF,line1,line2;

// clip line {x1,y1,c2,y2} with a semiplane represented
// by a point (xa,ya) and a vector(dx,dy)
function clipByHalfPlane(lineData, xa,ya, dx, dy) {
    if(lineData == null) return null;
    let x1 = lineData.x1 - xa;
    let y1 = lineData.y1 - ya;
    let x2 = lineData.x2 - xa;
    let y2 = lineData.y2 - ya;
    let v1 = x1*dx+y1*dy;
    let v2 = x2*dx+y2*dy;
    if(v1*v2>0.0) {
        if(v1<0.0) return null;
        else return lineData;
    } else {
        let t = -v1/(v2-v1);
        let x = x1 * (1-t) + x2 * t;
        let y = y1 * (1-t) + y2 * t;
        if(v1<0) {
            return {x1:x+xa,y1:y+ya,x2:x2+xa,y2:y2+ya};
        } else {
            return {x1:x1+xa,y1:y1+ya,x2:x+xa,y2:y+ya};
        }
    }    
}

function clipByRect(lineData, rectData) {
    let x1 = rectData.x, y1 = rectData.y;
    let x2 = x1 + rectData.w, y2 = y1 + rectData.h;
    lineData = clipByHalfPlane(lineData, x1, y1, 1,0);
    lineData = clipByHalfPlane(lineData, x1, y1, 0,1);
    lineData = clipByHalfPlane(lineData, x2, y2, -1,0);
    lineData = clipByHalfPlane(lineData, x2, y2, 0,-1);
    return lineData;
}

function segmentIntersection(s1, s2) {
    let x1=s1.x1, y1=s1.y1, x2=s1.x2, y2=s1.y2;
    let x3=s2.x1, y3=s2.y1, x4=s2.x2, y4=s2.y2;
    let den = (x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
    if(den == 0.0) return null;
    return {
        x : ((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/den,
        y : ((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/den        
    }
}

function updateLineShape(lineShape, p1, p2) {

    let x1 = p1.x;
    let y1 = p1.y;
    let x2 = p2.x;
    let y2 = p2.y;
    let dx = x2-x1, dy = y2-y1;
    let d = Math.sqrt(dx*dx+dy*dy);
    const eps = 1.0e-8;
    if(d>eps) {
        let big = 1.0e6;
        extendedLineData = clipByRect({
            x1:x1-dx*big,
            y1:y1-dy*big,
            x2:x2+dx*big,
            y2:y2+dy*big}, bounds);
        if(extendedLineData != null) {
            outside = false;
            lineShape.attr({
                x1:extendedLineData.x1,
                y1:extendedLineData.y1,
                x2:extendedLineData.x2,
                y2:extendedLineData.y2,
                visibility:'visible'
                });            
            return;
        }
    }
    lineShape.attr({visibility:'hidden'});
}


class Dot {
    constructor(x, y, name) {
        this.x = x;
        this.y = y;
        this.name = name;
    }
    create(snap) {
        let dot = this.dot = snap.circle(this.x,this.y,10);
        dot.attr({
            fill: "#bada55",
            stroke: "#000",
            strokeWidth: 2
        }).mouseover(function() {
            this.animate({
                fill: "#ff0000"
            }, 100);
        }).mouseout(function() {
            this.animate({
                fill: "#bada55"
            }, 100);
        });
        let cx,cy;
        const me = this;
        dot.drag((dx,dy) => {   
            if(me.onDrag) me.onDrag(dx+cx, dy+cy);       
        }, (x,y) => {
            cx = me.x;
            cy = me.y;
        }); 
    }
    setPos(x, y) {
        this.x = x;
        this.y = y;
        this.dot.attr({cx:this.x,cy:this.y})
    }
}

function makeRectangle(snap, rectangleData) {
    let r = snap.rect(
        rectangleData.x,
        rectangleData.y,
        rectangleData.w,
        rectangleData.h);
    r.attr({stroke:"#000", fill:'none', strokeWidth:1});
    return r;
}

function getLine(lineShape) {
    return {
        x1:+lineShape.attr('x1'),
        y1:+lineShape.attr('y1'),
        x2:+lineShape.attr('x2'),
        y2:+lineShape.attr('y2'),
    }
}

let permIndex = 0;
let lines = [];
let pappusLines = [];
    
window.addEventListener('DOMContentLoaded', () => {
    snap = Snap("#svg");

    bounds = {x:10,y:10,w:780,h:780};
    makeRectangle(snap, bounds);
    line1 = snap.line(0,0,10,10).attr({stroke:'#000',lineWidth:1});
    line2 = snap.line(0,0,10,10).attr({stroke:'#000',lineWidth:1});
    for(let i=0; i<36; i++) {
        let line = snap.line(0,0,10,10).attr({
            stroke:'#ccc',
            lineWidth:1,
            visibility:'hidden'
        });
        lines.push(line);
    }
    for(let i=0; i<9; i++) {
        let line = snap.line(0,0,10,10).attr({
            stroke:'#A40',
            lineWidth:1,
            visibility:'hidden'
        });
        pappusLines.push(line);
    }

    pA = new Dot(200,150,'A');
    pB = new Dot(200,200,'B');
    pC = new Dot(200,300,'C');
    pD = new Dot(450,150,'D');
    pE = new Dot(450,200,'E');
    pF = new Dot(450,300,'F');
    [pA,pB,pC,pD,pE,pF].forEach(p=>p.create(snap));

    pB.t = 0.3;
    pE.t = 0.4;


    update();
    [pA,pC,pD,pF].forEach(p => {
        p.onDrag = (x,y) => { p.setPos(x,y); update(); };
    })
    /*
    bounds = new Rectangle(50,50,750,750);
    bounds.create(snap);
    

    line1 = new Line(pA,pB,pC, bounds);
    line2 = new Line(pD,pE,pF, bounds);

    [line1,line2,pA,pB,pC,pD,pE,pF].forEach(p=>p.create(snap));

    */
    
});


function updateMidPoint(p,pa,pb) {
    let t = p.t;
    p.setPos(pa.x*(1-t)+pb.x*t, pa.y*(1-t)+pb.y*t);
}

function update() {
    updateLineShape(line1, pA,pC);
    updateLineShape(line2, pD,pF);
    updateMidPoint(pB,pA,pC);
    updateMidPoint(pE,pD,pF);
    

    let pp = [pD,pE,pF];
    let perms = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];

    let perm = perms[permIndex];
    updateLineShape(lines[0], pA,pp[perm[1]]);
    updateLineShape(lines[1], pB,pp[perm[0]]);
    updateLineShape(lines[2], pB,pp[perm[2]]);
    updateLineShape(lines[3], pC,pp[perm[1]]);
    updateLineShape(lines[4], pA,pp[perm[2]]);
    updateLineShape(lines[5], pC,pp[perm[0]]);    
    
    let p1 = segmentIntersection(
        getLine(lines[0]),
        getLine(lines[1]));
    let p2 = segmentIntersection(
        getLine(lines[4]),
        getLine(lines[5]));
    console.log(p1,p2);
    if(p1 != null && p2 != null) {
        updateLineShape(pappusLines[0],p1,p2);
    }
    
}