<?php

return [
    // Ajustá a los horarios reales. Ejemplo de bloques de 6 horas:
    'horarios' => [
        'manana' => ['07:00', '13:00'],
        'tarde'  => ['13:00', '19:00'],
        'noche'  => ['19:00', '01:00'],   // cruza medianoche
    ],
    'especial' =>[
        'min_horas'=>8,
        'max_horas'=>12,
    ],
    'tolerancia_min' => 15,   //  minutos de tolerancia
];