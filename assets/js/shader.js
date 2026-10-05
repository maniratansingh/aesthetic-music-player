const vertexShaderSource = `#version 300 es
    in vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `#version 300 es
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    out vec4 fragColor;

    #define S(a,b,t) smoothstep(a,b,t)

    mat2 Rot(float a)
    {
        float s = sin(a);
        float c = cos(a);
        return mat2(c, -s, s, c);
    }

    vec2 hash( vec2 p )
    {
        p = vec2( dot(p,vec2(2127.1,81.17)), dot(p,vec2(1269.5,283.37)) );
        return fract(sin(p)*43758.5453);
    }

    float noise( in vec2 p )
    {
        vec2 i = floor( p );
        vec2 f = fract( p );
        
        vec2 u = f*f*(3.0-2.0*f);

        float n = mix( mix( dot( -1.0+2.0*hash( i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ), 
                            dot( -1.0+2.0*hash( i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                       mix( dot( -1.0+2.0*hash( i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ), 
                            dot( -1.0+2.0*hash( i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
        return 0.5 + 0.5*n;
    }

    void main()
    {
        vec2 fragCoord = gl_FragCoord.xy;
        vec2 uv = fragCoord/iResolution.xy;
        float ratio = iResolution.x / iResolution.y;

        vec2 tuv = uv;
        tuv -= .5;

        // rotate with Noise
        float degree = noise(vec2(iTime*.1, tuv.x*tuv.y));

        tuv.y *= 1./ratio;
        tuv = Rot(radians((degree-.5)*720.+180.)) * tuv;
        tuv.y *= ratio;

        // Wave warp with sin
        float frequency = 5.;
        float amplitude = 30.;
        float speed = iTime * 2.;
        tuv.x += sin(tuv.y*frequency+speed)/amplitude;
        tuv.y += sin(tuv.x*frequency*1.5+speed)/(amplitude*.5);
        
        // draw the image
        vec3 colorYellow = vec3(.957, .804, .623);
        vec3 colorDeepBlue = vec3(.192, .384, .933);
        vec3 layer1 = mix(colorYellow, colorDeepBlue, S(-.3, .2, (Rot(radians(-5.)) * tuv).x));
        
        vec3 colorRed = vec3(.910, .510, .8);
        vec3 colorBlue = vec3(0.350, .71, .953);
        vec3 layer2 = mix(colorRed, colorBlue, S(-.3, .2, (Rot(radians(-5.)) * tuv).x));
        
        vec3 finalComp = mix(layer1, layer2, S(.5, -.3, tuv.y));
        
        fragColor = vec4(finalComp, 1.0);
    }
`;

function initShader() {
    const canvas = document.getElementById('glcanvas');
    if (!canvas) return;
    const gl = canvas.getContext('webgl2');
    if (!gl) { console.error('WebGL not supported'); return; }

    function compileShader(source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    const vs = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fs = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(program, 'iResolution');
    const timeLoc = gl.getUniformLocation(program, 'iTime');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resLoc, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    const startTime = performance.now();
    function render() {
        const currentTime = (performance.now() - startTime) / 1000.0;
        gl.uniform1f(timeLoc, currentTime);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }
    render();
}

document.addEventListener('DOMContentLoaded', initShader);
