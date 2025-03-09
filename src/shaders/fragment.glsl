uniform float u_time;
uniform vec2 u_resolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float strength = sin(u_time + length(uv) * 5.0) * 0.5 + 0.5;
  gl_FragColor = vec4(vec3(strength), 1.0);
}
