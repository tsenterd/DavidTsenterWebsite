<?php

/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace GlubeApp {

    class Glube {
        public $cubes;
        const num_cubes = 4;

        function initialize() {

            function getInput($param, $n) {
                $default = filter_input(INPUT_GET, $param, FILTER_SANITIZE_STRING);
                $value = filter_input(INPUT_GET, $param . $n, FILTER_SANITIZE_STRING);

                return $value ?: $default;
            }

            $cubes = [];
            foreach (range(1, self::num_cubes) as $n) {
                $alg = getInput('alg', $n);
                $algType = getInput('type', $n);
                if ($algType != 'generator' && $algType != 'solver') {
                    $algType = 'solver';
                }
                $stickers = getInput('stickers', $n);

                $cube = new \stdClass;
                $cube->alg = $alg;
                $cube->algType = $algType;
                $cube->stickers = $stickers;
                $cubes[$n] = $cube;
            }
            return $cubes;
        }
    }
}
?>