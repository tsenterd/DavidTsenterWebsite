# rubiks-cube
GLube, a WebGL Rubik's Cube

## History
Java used to be the go-to solution for Rubik's cube applets (no pun intended with the Go-To). The last couple of years people
have gotten used to HTML5+CSS3 which gives a very slick experience in regular browsers. Browsers are not plain text, links and images anymore. They have become so much more.

One of the last frontiers of the browser is 3D. We now have the canvas element in modern browsers, and with it we start 
experiencing more 3D. SVG didn't bring what was promised as far as 3D was concerned. Flash has died, killed by Apple, and now
Android. The only alternative left is 'native' browser code with javascript.

Fortunately the browsers have become up to speed lately, even IE. And with multiple cores in our systems, performance shouldn't be a problem. In a couple of years I am assuming that the same technologies will come to the mobile browsers with enough CPU and GPU speed.

## Online Cubes and their issues
The two most popular solutions online suffer from several issues: Randelshofer's [CubeTwister](http://www.randelshofer.ch/cubetwister/) is beautiful, but has a complex API and is not in active development anymore, though there is a limited WebGL demo version now. Lucas Garron's [twisty.js](http://www.cubing.net/twisty.js/) is fast but doesn't look as nice and isn't easily 'pluggable' in a page. The main problem with all Java applets is that browsers are starting to block any plugins for security issues. The many updates of Java don't really help either.

Some people have recognized the same need and have provided alternatives already. [RoofPig](https://github.com/larspetrus/Roofpig) by Lars Petrus is fast, configurable and just works. However, it's not nearly the beautiful cube that Randelshofer presented with RubikPlayer. 

Google created a [great project](https://www.chrome.com/cubelab) for the anniversary of the Rubik's cube: a Google doodle on their home page. It was a completely playable Rubik's cube, made with Thee.js, HTML5 and CSS3. Again, it is a great project, but it looks more like a toy than a real cube. It is possible however that a really nice looking, realistic cube can be made on the foundation of the Google Cube code.  

## Overview of online cubes
Name        | Creator          | Technology | Library
----------- | ---------------- | ---------- | ---------
AnimCube    | J. Jelinek       | Java       | custom
CubeTwister | W. Randelshofer  | Java       | custom
RoofPig     | Lars Petrus      | JavaScript | Three.js
CubeLab     | Google           | JavaScript | Three.js
Twisty      | Lucas Garron     | JavaScript | Three.js
GLube       | M. van der Blonk | JavaScript | custom

## Plans for development
The GLube project will ultimately be a full replacement for online cube algorithm demonstrations. The cubes will be easily 
pluggable in either a static website, a PHP site, or a WordPress blog (using a plugin). It will include tools for working
with algorithms (inverse, mirror, etc). 

The current version is already embeddable with some manual work and is configurable with stickers, an initial algorithm, either in Generator or Solver mode (inverse). 

## Special thanks
Special thanks go to Tiffany Wang for her beautiful cube.

Find out more about how to use GLube in the [documentation](https://github.com/blonkm/rubiks-cube/wiki/Documentation)
