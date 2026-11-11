shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Shader inspired by 2025_09_15_blender_projected_circles.blend
// Recreates:
// 1. Concentric projected circular contour rings wrapping around the sphere
// 2. Anisotropic & iridescent chromatic sheen across viewing angles (Blender TexMagic / HueShift)
// 3. Dynamic pointer ripple waves & interactive proximity flare
// 4. Mobile XR optimized ALU instructions (Snapdragon XR2 Gen 2 / Adreno 740 & Metal)

uniform vec4 base_color : source_color = vec4(0.02, 0.04, 0.07, 1.0);
uniform vec4 ring_color : source_color = vec4(0.0, 0.85, 1.0, 1.0);
uniform vec4 rim_color : source_color = vec4(0.18, 0.98, 0.72, 1.0);
uniform float ring_frequency : hint_range(5.0, 60.0) = 28.0;
uniform float ring_thickness : hint_range(0.01, 0.5) = 0.16;
uniform float ring_glow : hint_range(0.5, 8.0) = 3.6;
uniform float fresnel_power : hint_range(0.5, 6.0) = 2.4;
uniform float iridescence_strength : hint_range(0.0, 1.0) = 0.6;
uniform float pulse_phase = 0.0;
uniform float proximity_infl : hint_range(0.0, 1.0) = 0.0;
uniform vec3 pointer_local = vec3(0.0, 0.0, 1.0);

varying vec3 v_local_pos;
varying vec3 v_local_normal;

void vertex() {
	v_local_pos = VERTEX;
	v_local_normal = NORMAL;
}

vec3 rainbow_hue(float t) {
	// Cosine-based spectral gradient mimicking Blender TexMagic / HueShift iridescence
	return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 0.66, 0.33) + t));
}

void fragment() {
	vec3 view_dir = normalize(VIEW);
	vec3 normal = normalize(NORMAL);
	float ndotv = clamp(dot(view_dir, normal), 0.0, 1.0);
	float fresnel = pow(1.0 - ndotv, fresnel_power);

	// 1. Concentric Circle Projection along local tilted axis
	vec3 proj_axis = normalize(vec3(0.0, 1.0, 0.25));
	float dist_axis = length(v_local_pos - proj_axis * dot(v_local_pos, proj_axis));

	// Pointer ripple wave when interactive
	float pointer_dist = length(v_local_pos - pointer_local);
	float ripple = sin(pointer_dist * 32.0 - pulse_phase * 4.0) * (proximity_infl * 0.018);

	// Primary projected contour rings
	float ring_coord = (dist_axis + ripple) * ring_frequency - pulse_phase * 0.75;
	float ring_dist = abs(fract(ring_coord) - 0.5) * 2.0;
	float ring_mask = smoothstep(ring_thickness, 0.0, ring_dist);

	// Secondary harmonic fine rings
	float ring_coord_fine = dist_axis * (ring_frequency * 2.2) + pulse_phase * 0.4;
	float ring_dist_fine = abs(fract(ring_coord_fine) - 0.5) * 2.0;
	float ring_mask_fine = smoothstep(ring_thickness * 0.6, 0.0, ring_dist_fine) * 0.4;

	float total_ring = clamp(ring_mask + ring_mask_fine, 0.0, 1.0);

	// 2. Iridescent chromatic sheen
	float iri_t = fract(fresnel * 1.4 + ndotv * 0.4 + dot(v_local_pos, vec3(0.4, 0.8, 0.3)) * 1.8);
	vec3 iri_col = rainbow_hue(iri_t);

	// 3. Composite Albedo & Emission
	vec3 col = base_color.rgb;
	col = mix(col, iri_col, fresnel * iridescence_strength);

	// Vibrant emission with ColorRamp gradient
	vec3 active_ring_col = mix(ring_color.rgb, rim_color.rgb, total_ring);
	vec3 emission_out = active_ring_col * total_ring * (ring_glow + proximity_infl * 2.8);
	emission_out += rim_color.rgb * pow(fresnel, 2.5) * (1.3 + proximity_infl * 1.5);

	ALBEDO = col;
	METALLIC = 0.92;
	ROUGHNESS = 0.14;
	SPECULAR = 0.85;
	EMISSION = emission_out;
}
