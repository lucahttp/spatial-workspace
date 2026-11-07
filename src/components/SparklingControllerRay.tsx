import { useFrame, useThree } from '@react-three/fiber'
import { useXRInputSourceStates } from '@react-three/xr'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three'
import { classifyHandKinematics } from '../services/handTracking'
import { useWorkspace } from '../store'
import { color } from '../theme'

const RAY_LENGTH = 2.2
const RAY_RADIUS = 0.0022

function SingleControllerRay({
  index,
  inputSource,
}: {
  index: number
  inputSource: XRInputSource
}) {
  const gl = useThree((s) => s.gl)
  const beamGroupRef = useRef<Group>(null)
  const coreBeamRef = useRef<Mesh>(null)
  const auraBeamRef = useRef<Mesh>(null)
  const reticleRef = useRef<Mesh>(null)
  const sparkRef = useRef<Mesh>(null)

  const setIsGripActive = useWorkspace((s) => s.setIsGripActive)
  const wasGripPressed = useRef(false)

  // Attach beam group to WebXR controller ray space
  useEffect(() => {
    const controller = gl.xr.getController(index)
    const beam = beamGroupRef.current
    if (controller && beam) {
      controller.add(beam)
      return () => {
        controller.remove(beam)
      }
    }
  }, [gl, index])

  // Process hand joints if this input source is a tracked hand
  const jointMapRef = useRef<Map<string, Vector3>>(new Map())

  useFrame((_, delta) => {
    // 1. Check Hand Tracking joints
    if (inputSource.hand) {
      const frame = (gl.xr as any).getFrame?.()
      const refSpace = gl.xr.getReferenceSpace()
      if (frame && refSpace) {
        inputSource.hand.forEach((joint, jointName) => {
          const pose = frame.getJointPose(joint, refSpace)
          if (pose) {
            const p = pose.transform.position
            let vec = jointMapRef.current.get(jointName)
            if (!vec) {
              vec = new Vector3()
              jointMapRef.current.set(jointName, vec)
            }
            vec.set(p.x, p.y, p.z)
          }
        })

        if (jointMapRef.current.size > 0) {
          const handData = classifyHandKinematics(
            jointMapRef.current,
            inputSource.handedness === 'left' ? 'left' : 'right'
          )
          // If hand is making a grip gesture, activate grip state
          if (handData.gesture === 'grip') {
            setIsGripActive(true)
          }
        }
      }
    }

    // 2. Check Gamepad buttons (Controllers)
    const gamepad = inputSource.gamepad
    const gripButton = gamepad?.buttons?.[1]
    const triggerButton = gamepad?.buttons?.[0]

    const gripPressed = !!gripButton?.pressed || (gripButton?.value ?? 0) > 0.45
    const triggerPressed = !!triggerButton?.pressed || (triggerButton?.value ?? 0) > 0.45

    if (gripPressed !== wasGripPressed.current) {
      wasGripPressed.current = gripPressed
      setIsGripActive(gripPressed)
    }

    // 3. Animate Sparkling Ray Beam
    if (!beamGroupRef.current) return

    if (gripPressed) {
      // Flash / sparkle active!
      beamGroupRef.current.visible = true

      const pulse = Math.sin(Date.now() * 0.015 + index * 2) * 0.35 + 0.65
      const sparkScale = triggerPressed ? 1.8 : 1.0

      if (coreBeamRef.current) {
        const mat = coreBeamRef.current.material as MeshBasicMaterial
        mat.opacity = 0.85 * pulse
      }

      if (auraBeamRef.current) {
        const mat = auraBeamRef.current.material as MeshBasicMaterial
        mat.opacity = 0.45 * pulse
        auraBeamRef.current.scale.set(1 + pulse * 0.3, 1, 1 + pulse * 0.3)
      }

      if (reticleRef.current) {
        reticleRef.current.rotation.z += delta * 4
        reticleRef.current.scale.setScalar(sparkScale * (0.9 + pulse * 0.2))
      }

      if (sparkRef.current) {
        sparkRef.current.scale.setScalar(sparkScale * (0.8 + Math.random() * 0.4))
      }
    } else {
      // Hidden or dormant tracer when Grip is not held
      beamGroupRef.current.visible = false
    }
  })

  // Geometries and Materials for sparkling beam
  const coreGeo = useMemo(() => new CylinderGeometry(RAY_RADIUS, RAY_RADIUS * 0.6, RAY_LENGTH, 12), [])
  const auraGeo = useMemo(() => new CylinderGeometry(RAY_RADIUS * 2.8, RAY_RADIUS * 1.5, RAY_LENGTH, 12), [])
  const reticleGeo = useMemo(() => new RingGeometry(0.012, 0.018, 24), [])
  const sparkGeo = useMemo(() => new SphereGeometry(0.014, 16, 16), [])

  const coreMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    []
  )

  const auraMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(color.accent),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    []
  )

  const reticleMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(color.purple),
        transparent: true,
        opacity: 0.9,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    []
  )

  const sparkMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color('#a78bfa'),
        transparent: true,
        opacity: 0.85,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    []
  )

  return (
    <group ref={beamGroupRef} visible={false}>
      {/* Laser cylinder aligned with -Z forward direction of controller ray */}
      <group position={[0, 0, -RAY_LENGTH / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh ref={coreBeamRef} geometry={coreGeo} material={coreMat} />
        <mesh ref={auraBeamRef} geometry={auraGeo} material={auraMat} />
      </group>

      {/* Pulsing Luminous Reticle Target Ring at ray distance */}
      <mesh ref={reticleRef} position={[0, 0, -RAY_LENGTH]} geometry={reticleGeo} material={reticleMat} />

      {/* Sparkling Core Point Light & Star */}
      <mesh ref={sparkRef} position={[0, 0, -RAY_LENGTH]} geometry={sparkGeo} material={sparkMat} />
      <pointLight position={[0, 0, -RAY_LENGTH]} color={color.accent} distance={0.6} intensity={1.8} />
    </group>
  )
}

export function SparklingControllerRay() {
  const inputSources = useXRInputSourceStates()

  return (
    <group>
      {inputSources.map((state, i) => (
        <SingleControllerRay key={i} index={i} inputSource={state.inputSource} />
      ))}
    </group>
  )
}
