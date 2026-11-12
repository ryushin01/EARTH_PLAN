import { MAX_ASHES, MAX_STORMS, MAX_WAVES } from '../model/planet'

export const earthVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vPos;
varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vPos = normalize(position);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const earthFragment = /* glsl */ `
#define MAX_WAVES ${MAX_WAVES}
#define MAX_ASHES ${MAX_ASHES}

uniform sampler2D uAlbedo;
uniform sampler2D uLights;
uniform sampler2D uElevation;
uniform vec3 uSun;
uniform float uSeaLevel;
uniform float uIceN;
uniform float uIceS;
uniform float uSnowN;
uniform float uSnowS;
uniform float uSnowAlt;
uniform float uArid;
uniform float uTime;
uniform vec4 uWaves[MAX_WAVES];
uniform float uWaveStrength[MAX_WAVES];
uniform vec4 uAsh[MAX_ASHES];
uniform float uAshAmount[MAX_ASHES];

varying vec2 vUv;
varying vec3 vPos;
varying vec3 vNormalW;
varying vec3 vViewDir;

float fullHeight(float g) {
  g *= 255.0;
  if (g >= 128.0) { float t = (g - 128.0) / 127.0; return t * t * 8800.0; }
  float t = (127.0 - g) / 127.0;
  return -t * t * 11000.0;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// 부드러운 값 노이즈 (적설·해빙 경계를 자연스럽게)
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  return noise(p) * 0.55 + noise(p * 2.3) * 0.3 + noise(p * 5.1) * 0.15;
}

void main() {
  vec4 elev = texture2D(uElevation, vUv);
  float land = step(0.5, elev.b);
  // 해발 0m 미만 육지(간척지 등)는 기존 제방이 0.5m까지 지킨다고 봅니다
  float hLow = max(elev.r * 255.0 - 50.0, 0.5);
  float h = fullHeight(elev.g);
  float lat = degrees(asin(clamp(vPos.y, -1.0, 1.0)));
  vec3 albedo = texture2D(uAlbedo, vUv).rgb;
  vec3 color = albedo;

  // 건조화: 기온이 오르면 중위도·저위도 초록 지대가 누렇게
  float green = clamp((albedo.g - max(albedo.r, albedo.b)) * 6.0, 0.0, 1.0);
  float belt = 1.0 - smoothstep(48.0, 66.0, abs(lat));
  vec3 dry = vec3(0.62, 0.5, 0.32) * (0.45 + dot(albedo, vec3(0.6)));
  color = mix(color, dry, land * green * belt * uArid * 0.85);

  // 계절 적설과 만년설
  float n = fbm(vUv * vec2(160.0, 80.0));
  float snowN = smoothstep(uSnowN - 3.0, uSnowN + 3.0, lat + (n - 0.5) * 10.0);
  float snowS = 1.0 - smoothstep(uSnowS - 3.0, uSnowS + 3.0, lat - (n - 0.5) * 10.0);
  float snowAlt = smoothstep(uSnowAlt - 300.0, uSnowAlt + 500.0, h + (n - 0.5) * 900.0);
  float snow = land * clamp(max(max(snowN, snowS) * (0.55 + 0.35 * n), snowAlt * 0.9), 0.0, 1.0);
  color = mix(color, vec3(0.92, 0.95, 1.0), snow);

  // 해수면 상승 침수
  float flooded = land * (1.0 - smoothstep(uSeaLevel - 0.35, uSeaLevel + 0.35, hLow)) * step(hLow, 204.0);
  float depth = clamp((uSeaLevel - hLow) / 30.0, 0.0, 1.0);
  vec3 floodColor = mix(vec3(0.09, 0.42, 0.55), vec3(0.03, 0.16, 0.32), depth);
  color = mix(color, floodColor, flooded * 0.92);
  float front = flooded * (1.0 - flooded) * 4.0;
  color += vec3(0.0, 0.63, 1.0) * front * 0.6;
  float water = mix(1.0, flooded, land);

  // 해빙
  float iceN = smoothstep(uIceN - 1.5, uIceN + 1.5, lat + (n - 0.5) * 6.0);
  float iceS = 1.0 - smoothstep(uIceS - 1.5, uIceS + 1.5, lat - (n - 0.5) * 6.0);
  float ice = (1.0 - land) * max(iceN, iceS);
  color = mix(color, vec3(0.86, 0.92, 0.97), ice * 0.92);
  water *= 1.0 - ice;

  // 화산재
  float ashCover = 0.0;
  for (int i = 0; i < MAX_ASHES; i++) {
    if (uAshAmount[i] <= 0.0) continue;
    float d = acos(clamp(dot(vPos, uAsh[i].xyz), -1.0, 1.0));
    float a = uAshAmount[i] * (1.0 - smoothstep(uAsh[i].w * 0.45, uAsh[i].w, d));
    color = mix(color, vec3(0.3, 0.27, 0.25), a * 0.78);
    ashCover = max(ashCover, a);
  }

  // 빛: 태양 방향으로 낮과 밤
  vec3 nrm = normalize(vNormalW);
  float ndl = dot(nrm, uSun);
  float day = smoothstep(-0.1, 0.2, ndl);
  vec3 lit = color * (0.035 + 1.1 * max(ndl, 0.0));
  vec3 halfV = normalize(uSun + vViewDir);
  lit += vec3(1.0, 0.94, 0.82) * pow(max(dot(nrm, halfV), 0.0), 900.0) * water * 0.5 * step(0.0, ndl);
  // 낮·밤 경계의 붉은 빛
  lit += vec3(0.9, 0.35, 0.1) * (1.0 - abs(ndl * 6.0)) * step(abs(ndl), 0.16) * 0.06;

  // 밤의 도시 불빛 (잠긴 곳과 화산재 아래는 꺼짐)
  vec3 lights = texture2D(uLights, vUv).rgb * (1.0 - flooded) * (1.0 - ashCover * 0.85);
  lit += lights * vec3(1.0, 0.72, 0.4) * (1.0 - day) * 1.3;

  // 밤에도 화산재 장막이 보이도록
  lit = mix(lit, vec3(0.11, 0.1, 0.095), ashCover * 0.55 * (1.0 - day));

  // 쓰나미 파면
  for (int i = 0; i < MAX_WAVES; i++) {
    if (uWaveStrength[i] <= 0.0) continue;
    float d = acos(clamp(dot(vPos, uWaves[i].xyz), -1.0, 1.0));
    float r = uWaves[i].w;
    float ring = exp(-pow((d - r) / 0.01, 2.0));
    float trail = step(d, r) * smoothstep(r - 0.12, r, d) * 0.35;
    float ripple = step(d, r) * (0.5 + 0.5 * sin((d - r) * 220.0 - uTime * 4.0)) * smoothstep(r - 0.3, r, d) * 0.15;
    lit += vec3(0.35, 0.85, 1.0) * (ring + trail + ripple) * uWaveStrength[i] * (0.06 + 0.94 * water);
  }

  // 대기 가장자리
  float rim = pow(1.0 - max(dot(nrm, vViewDir), 0.0), 3.0);
  lit += vec3(0.3, 0.6, 1.0) * rim * 0.45 * (0.15 + day);

  gl_FragColor = vec4(lit, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export const cloudFragment = /* glsl */ `
#define MAX_STORMS ${MAX_STORMS}

uniform sampler2D uClouds;
uniform vec3 uSun;
uniform float uCover;
uniform float uOffset;
uniform float uTime;
uniform vec4 uStorms[MAX_STORMS];
uniform vec2 uStormInfo[MAX_STORMS];

varying vec2 vUv;
varying vec3 vPos;
varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  // 구름 텍스처는 알파 채널에 구름 양이 들어 있음
  float c = texture2D(uClouds, vec2(vUv.x + uOffset, vUv.y)).a;
  float c2 = texture2D(uClouds, vec2(vUv.x - uOffset * 0.6 + 0.37, vUv.y)).a;
  float base = max(c, c2 * 0.55);
  float lo = 0.55 - uCover * 0.7;
  float a = smoothstep(lo, lo + 0.6, base) * 0.92;

  // 열대 저기압 나선
  for (int i = 0; i < MAX_STORMS; i++) {
    float strength = uStormInfo[i].x;
    if (strength <= 0.0) continue;
    vec3 center = uStorms[i].xyz;
    float radius = uStorms[i].w;
    float d = acos(clamp(dot(vPos, center), -1.0, 1.0));
    if (d > radius) continue;
    vec3 t1 = normalize(cross(center, vec3(0.0, 1.0, 0.0)));
    vec3 t2 = cross(center, t1);
    float ang = atan(dot(vPos, t2), dot(vPos, t1));
    float rr = d / radius;
    float hemi = uStormInfo[i].y;
    float spiral = sin(ang * 2.0 + hemi * log(rr + 0.03) * 7.0 + uTime * hemi * 1.2);
    float arms = smoothstep(-0.1, 0.8, spiral) * (1.0 - smoothstep(0.55, 1.0, rr));
    float core = 1.0 - smoothstep(0.0, 0.35, rr);
    float eye = smoothstep(0.03, 0.09, rr);
    a = max(a, clamp(max(arms * 0.85, core), 0.0, 1.0) * eye * strength);
  }

  vec3 nrm = normalize(vNormalW);
  float ndl = dot(nrm, uSun);
  float light = 0.04 + max(ndl, 0.0);
  float day = smoothstep(-0.15, 0.2, ndl);
  gl_FragColor = vec4(vec3(light), a * (0.12 + 0.88 * day));
  #include <colorspace_fragment>
}
`

export const atmosphereVertex = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

export const atmosphereFragment = /* glsl */ `
uniform vec3 uSun;
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  float facing = dot(normalize(vNormalW), normalize(vViewDir));
  float glow = pow(clamp(1.0 + facing * 1.25, 0.0, 1.0), 3.0);
  float day = smoothstep(-0.35, 0.4, dot(normalize(vNormalW), uSun));
  vec3 color = mix(vec3(0.1, 0.25, 0.6), vec3(0.35, 0.7, 1.0), day);
  gl_FragColor = vec4(color, glow * (0.12 + 0.88 * day) * 0.9);
}
`
