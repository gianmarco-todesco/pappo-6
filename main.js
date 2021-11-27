
let snap;
let bounds;
let pA,pB,pC,pD,pE,pF,line1,line2;
let enabledPappusLine = new Array(6).fill(true);

function clamp(x,x0,x1) { return x<x0?x0:x>x1?x1:x; }

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
    if(Math.abs(den) < 1.0e-8) return null;
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
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.clicked = false;
        this.mouseIsHovering = false;
        this.highlighted = false;
        this.highlightedColor = "#ff0000";
        this.normalColor = "#bada55";
    }

    setMouseIsHovering(hovering) {
        this.mouseIsHovering = hovering;
        this.updateHighlightStatus();
    }
    setClicked(clicked) {
        this.clicked = clicked;
        this.updateHighlightStatus();
    }
    updateHighlightStatus() {
        let s = this.clicked || this.mouseIsHovering;
        if(s != this.highlighted) {
            this.highlighted = s;
            const color = s ? this.highlightedColor : this.normalColor;
            this.dot.animate({ fill: color }, 100);
        }
    }
    create(snap) {
        let dot = this.dot = snap.circle(this.x,this.y,4);
        let cx,cy;
        const me = this;
        dot.attr({
            fill: this.normalColor,
            stroke: "#000",
            strokeWidth: 1})
           .mouseover(() => this.setMouseIsHovering(true))
           .mouseout(() => this.setMouseIsHovering(false))         
           .drag(
                // on move
                (dx,dy) => { if(me.onDrag) me.onDrag(dx+cx, dy+cy, cx, cy); }, 
                // on start
                (x,y) => { cx = me.x; cy = me.y; this.setClicked(true); },
                // on end
                () => this.setClicked(false)); 
    }
    setPos(x, y) {
        this.x = x;
        this.y = y;
        this.dot.attr({cx:this.x,cy:this.y})
    }
}

class Line {
    constructor(x1,y1,x2,y2) {
        this.dots = [
            new Dot(x1,y1),
            new Dot((x1+x2)/2, (y1+y2)/2),
            new Dot(x2,y2)
        ];
        const me = this;
        for(let i=0; i<3; i++) {
            this.dots[i].onDrag = function(x,y) {
                me.setDot(i, x, y);
            }
        }
        this.onChanged = [];
    }

    create(snap) {
        let line = this.line = snap.line(0,0,0,0)
            .attr({stroke:'#000',strokeWidth:1.5});
        updateLineShape(line, this.dots[0], this.dots[2]);
        this.dots.forEach(dot => dot.create(snap));
    }

    getFrame() {
        const dots = this.dots;
        // cerco i due punti alla massima distanza
        let maxd = 0;
        let pa,pb;
        for(let i=0; i<3; i++) {
            let pi = {x:dots[i].x, y:dots[i].y};
            for(let j=0;j<3;j++) {
                if(i==j) continue;
                let pj = {x:dots[j].x, y:dots[j].y};
                let d = Snap.len(pi.x,pi.y,pj.x,pj.y);
                if(d>maxd) {
                    maxd = d;
                    pa = pi;
                    pb = pj;
                }
            }
        }
        let ux = (pb.x-pa.x)/maxd;
        let uy = (pb.y-pa.y)/maxd;
        let ts = this.dots.map(dot => 
            (dot.x - pa.x)*ux + (dot.y - pa.y)*uy);

        return {
            px: pa.x,
            py: pa.y,
            ux, uy,
            ts
        }
    }

    setDot(i,x,y) {
        
        const { px,py,ux,uy,ts } = this.getFrame();
        const dots = this.dots;
        let a = i==0 ? 1 : 0;
        let b = i==2 ? 1 : 2;
        const mrg = 10;
            
        if((ts[a]-ts[i])*(ts[b]-ts[i])<=0) {
            // i è interno; si sposta lungo la retta
            let t = (x-px)*ux + (y-py)*uy; // coord lineare (x,y) rispetto a AB
            t = clamp(t, mrg, ts[2]-mrg);
            dots[i].setPos(px+ux*t,py+uy*t); //  - (x-px)*uy, y + (x-py)*ux);
        } else {
            // i è esterno
            if((ts[i]-ts[a])*(ts[b]-ts[a])<=0) { [a,b] = [b,a];}
            // b è interno. a rimane fisso; b viene aggiornato
            if(Snap.len(x,y,dots[a].x,dots[a].y) < 2*mrg) return;
            let t = (ts[b]-ts[a])/(ts[i]-ts[a]);
            dots[i].setPos(x,y);
            dots[b].setPos(
                x*t+dots[a].x*(1-t), 
                y*t+dots[a].y*(1-t));
        }
        this.updateLineFromDots();
        const me = this;
        this.onChanged.forEach(f => f(me));
    }

    updateLineFromDots() {
        const frame = this.getFrame();

        updateLineShape(this.line, 
            {x:frame.px, y:frame.py},
            {x:frame.px+frame.ux, y:frame.py+frame.uy}
        );
    }
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
let intersections = [];

function zoom(e) {
    e.preventDefault();
    const sc = Math.exp(-e.deltaY*0.001);
    let matrix = Snap.matrix(1,0,0,1,0,0)
        .scale(sc,sc,e.clientX,e.clientY);
    transform(matrix)
}
function pan(e) {
    e.preventDefault();
    let matrix = Snap.matrix(1,0,0,1,e.movementX, e.movementY);
    transform(matrix);    
}

function handlePanAndZoom(svg) {
    svg.onwheel = zoom;
    svg.onpointerdown = (e) => {
        if(e.target == svg) {
            e.preventDefault();
            svg.onpointermove = pan;
            svg.onpointerup = (e) => {
                e.preventDefault();
                svg.onpointermove = null;
                svg.onpointerup = null;
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    snap = Snap("#svg");
    handlePanAndZoom(snap.node);

    bounds = {x:0,y:0,w:snap.node.clientWidth,h:snap.node.clientHeight};
    window.addEventListener('resize', ()=> {
        bounds = {x:0,y:0,w:snap.node.clientWidth,h:snap.node.clientHeight};
        updateAll();
    });




    
    for(let i=0; i<36; i++) {
        let line = snap.line(0,0,10,0).attr({
            stroke:'#ccc',
            strokeWidth:0.4,
            visibility:'hidden'
        });
        lines.push(line);
    }
    for(let i=0; i<9; i++) {
        let line = snap.line(0,0,10,10).attr({
            stroke:'#A22',
            strokeWidth:1,
            visibility:'hidden'
        });
        pappusLines.push(line);
    }
    for(let i=0; i<36; i++) {
        let pt = snap.circle(0,0,1.5).attr({
            fill:'#000',
            stroke:'none',
            visibility:'hidden'
        });
        intersections.push(pt);
    }

    line1 = new Line(100,100,200,400);
    line1.create(snap);
    line1.onChanged.push(updateAll);

    line2 = new Line(400,100,300,400);
    line2.create(snap);
    line2.onChanged.push(updateAll);
    updateAll();    
});


function updateMidPoint(p,pa,pb) {
    let t = p.t;
    p.setPos(pa.x*(1-t)+pb.x*t, pa.y*(1-t)+pb.y*t);
}

function transform(matrix) {
    [...line1.dots, ...line2.dots].forEach(dot => {
        dot.setPos(matrix.x(dot.x, dot.y), matrix.y(dot.x,dot.y));
    });
    line1.updateLineFromDots();
    line2.updateLineFromDots();
    updateAll();
}

let intersectionTable = {}
    

function updateAll() {
        
    let pts = [...line1.dots, ...line2.dots]
    for(let i=0; i<3; i++) {
        for(let j=3; j<6; j++) {
            updateLineShape(lines[i*3+j-3], pts[i], pts[j]);            
        }
    }
    intersectionTable = {}
    let k = 0;
    for(let i=0; i<8; i++) {
        for(let j=i+1; j<9; j++) {
            let p = segmentIntersection(
                getLine(lines[i]),
                getLine(lines[j]));
            // console.log(i,j,p);
            if(p) {
                intersections[k].attr({
                    'visibility':'visible',
                    'cx':p.x,
                    'cy':p.y
                });
            } else {
                intersections[k].attr({
                    'visibility':'hidden'
                });
            }
            k++;
            intersectionTable[i*9+j] = 
            intersectionTable[j*9+i] = p;
        }
    }

    let perms = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
    for(let i=0;i<6; i++) {
        let perm = perms[i];
        let L = []; // lines indices
        for(let j=0; j<6; j++) {
            let a = [0,1,1,2,0,2][j];
            let b = perm[[1,0,2,1,2,0][j]];
            L.push(a*3+b);
        }
        let p1 = intersectionTable[L[0]*9+L[1]];
        let p2 = intersectionTable[L[2]*9+L[3]];
        let p3 = intersectionTable[L[4]*9+L[5]];
        let m = (p1!=null?1:0) + (p2!=null?1:0) + (p3!=null?1:0);
        console.log(m);
        if(enabledPappusLine[i] && m>=2) {
            let pa = p1!=null ? p1 : p2;
            let pb = p3!=null ? p3 : p2;
            console.log(pa,pb)
            if(pa==null || pb==null) console.error(p1,p2,p3);
            updateLineShape(pappusLines[i], pa, pb);
        } else {
            pappusLines[i].attr('visibility','hidden');
        }        
    }
    
}