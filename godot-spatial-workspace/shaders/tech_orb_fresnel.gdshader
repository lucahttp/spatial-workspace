shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

// Procedural Fresnel & Depth gradient shader recreating the Spline 3D tech orb aesthetic.
// Designed for mobile XR with minimal ALU instructions and high specular bloom.

uniform vec4 base_color : source_color = vec4(0.02, 0.04, 0.08, 1.0);
uniform vec4 glow_color : source_color = vec4(0.15, 0.95, 0.65, 1.0);
uniform vec4 inner_rim_color : source_color = vec4(0.85, 1.0, 0.95, 1.0);
uniform float fresnel_power : hint_range(0.5, 6.0) = 2.2;
uniform float pulse_energy : hint_range(0.0, 6.0) = 1.6;
uniform float metallic_val : hint_range(0.0, 1.0) = 0.85;
uniform float roughness_val : hint_range(0.0, 1.0) = 0.15;

void fragment() {
	vec3 view_dir = normalize(VIEW);
	vec3 normal = normalize(NORMAL);
	float ndotv = clamp(dot(view_dir, normal), 0.0, 1.0);
	float fresnel = pow(1.0 - ndotv, fresnel_power);
	float rim = pow(fresnel, 2.2);

	vec3 col = mix(base_color.rgb, glow_color.rgb, fresnel);
	col = mix(col, inner_rim_color.rgb, rim * 0.75);

	ALBEDO = col;
	METALLIC = metallic_val;
	ROUGHNESS = roughness_val;
	EMISSION = (glow_color.rgb * fresnel * pulse_energy) + (inner_rim_color.rgb * rim * pulse_energy * 0.85);
}
