<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class FijarModoAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $request->session()->put('modo', 'admin');

        return $next($request);
    }
}