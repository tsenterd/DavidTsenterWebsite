<?php
require_once ("./classes/Glube.php");

$g = new GlubeApp\Glube();
$g->cubes = $g->initialize();
?>
<!DOCTYPE html>
<html class="no-js">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>GLube - Rubik's Cube</title>
        <meta name="description" content="A WebGL animated Rubik's cube by Michiel van der Blonk">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="http://maxcdn.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css">
        <link rel="stylesheet" href="static/main.css">
        <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
        <script src="js/jquery.easing.min.js"></script>
        <script src="http://netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js"></script>
        <script type="text/javascript" src="js/gl-matrix-min.js"></script>
        <script type="text/javascript" src="js/models.js"></script>
        <script type="text/javascript" src="js/rubiks.js"></script>
        <script id="fragmentShader" type="x-shader/x-fragment">
            varying highp vec4 position;
            varying highp vec3 normal;

            uniform bool lighting;
            uniform highp vec3 eyePosition;
            uniform highp vec4 ambient;
            uniform highp vec4 diffuse;
            uniform highp vec4 specular;
            uniform highp float shininess;

            const highp vec4 lightPosition = vec4(-1.,1.,-1., 1);
            const highp vec4 lightColor = vec4(.2,.2,.2,1);

            void main(void) {
                if (lighting) {
                    highp vec3 position = position.xyz / position.w;
                    highp vec3 eyeDirection = normalize(eyePosition - position);
                    highp vec3 lightPosition = lightPosition.xyz / lightPosition.w;
                    highp vec3 lightDirection = normalize(lightPosition - position);
                    highp vec3 halfAngle = normalize(lightDirection + eyeDirection);
                    highp vec4 diffuseTerm = diffuse * lightColor * max(dot(normal, lightDirection), 0.0);
                    highp vec4 specularTerm = specular * lightColor * pow(max(dot(normal, halfAngle), 0.0), shininess);
                    gl_FragColor = diffuseTerm + specularTerm + ambient;
                } else {
                    gl_FragColor = ambient;
                }
            }
        </script>
        <script id="vertexShader" type="x-shader/x-vertex">
            attribute vec3 vertexPosition;
            attribute vec3 vertexNormal;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            uniform mat3 normalMatrix;

            varying vec4 position;
            varying vec3 normal;

            void main(void) {
                position = modelViewMatrix * vec4(vertexPosition, 1.0);
                gl_Position = projectionMatrix * position;
                normal = normalize(normalMatrix * vertexNormal);
            }
       </script>
    </head>
    <body>
        <div class="container">
            <div class="row-fluid">
                <h3>GLube - Rubik's Cube</h3>
                <h5 class="text-muted">GLube - A Rubik's Cube with WebGL</h5>
                <a href="https://github.com/blonkm/rubiks-cube"><img src="static/GitHub-Mark-64px.png" alt="github logo"></a>
                <div class="help-block">
                    <div>Click and drag with <span class="control">left mouse</span> to rotate a layer</div>
                    <div>Click and drag with <span class="control">right mouse</span> to rotate the Rubik's Cube</div>
                    <div><strong>Parameters (in url, e.g. ?type=solver):</strong></div>
                    <div><span class="control">stickers</span> CROSS, FL, F2L, PLL, OLL, FULL</div>
                    <div><span class="control">alg</span> initial algorithm to perform</div>
                    <div><span class="control">type</span> generator, or solver</div>
                    <div><span class="control">&lt;param&gt;N</span> specific cube params, e.g. alg2=... for second cube</div>
                </div>
            </div>
            <div class="row">
<?php foreach ($g->cubes as $cube) {?>
                <div class="glube col-md-3">
                    <canvas data-alg="<?php echo $cube->alg ?>" data-type="<?php echo $cube->algType ?>" data-stickers="<?php echo $cube->stickers ?>"></canvas>
	                <div>
                        <button class="scramble-cube btn btn-info btn-sm"><span class="glyphicon glyphicon-random"></span></button>
                        <button class="reset-cube btn btn-info btn-sm"><span class="glyphicon glyphicon-fast-backward"></span></button>
                        <div class="scramble">
                            <label>Length</label>
                            <input type="number" class="scramble-length" min="1" value="20" />
                            <pre class="@brand-info moveList" style="margin-top:1em">moves will appear here</pre>
            </div>
                        <div class="alg">
                            <label>Algorithm</label>
                            <input class="algorithm form-control" placeholder="Algorithm" type="text" />
                        </div>
                        <button class="run-alg btn btn-info btn-sm"><span class="glyphicon glyphicon-play"></span></button>
                    </div>
                </div>
<?}?>
            </div>
        </div>
    </body>
</html>
