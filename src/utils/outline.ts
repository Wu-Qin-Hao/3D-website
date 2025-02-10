import * as THREE from "three";
import { OrbitControls } from "../../controls/OrbitControls"; // 导入轨道控制器

// Outline 类封装了 three.js 的场景设置和动画逻辑, 用于绘制轮廓
export class Outline {
  private scene: THREE.Scene; // 场景对象
  private camera: THREE.PerspectiveCamera; // 透视相机
  private renderer: THREE.WebGLRenderer; // WebGL 渲染器
  private box!: THREE.Mesh; // 立方体
  private controls!: OrbitControls; // 轨道控制器

  // 构造函数，初始化场景、相机、渲染器，并添加平面
  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene(); // 创建一个新的场景

    // 初始化透视相机
    this.camera = new THREE.PerspectiveCamera(
      75, // 视角
      window.innerWidth / window.innerHeight, // 宽高比
      0.1, // 近剪切面
      100 // 远剪切面
    );
    this.camera.position.z = 5; // 设置相机位置

    // 初始化 WebGL 渲染器
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(window.innerWidth, window.innerHeight); // 设置渲染器大小
    this.renderer.setClearColor(0xffffff); // 设置背景颜色为白色
    // 添加轨道控制器
    this.controls = new OrbitControls(
      this.camera,
      this.renderer.domElement as any
    );
    this.controls.enableDamping = true; // 启用阻尼效果
    this.controls.dampingFactor = 0.25; // 阻尼惯性
    this.controls.screenSpacePanning = false; // 禁用屏幕空间平移
    // this.controls.maxPolarAngle = Math.PI / 2; // 限制垂直旋转角度

    this.renderer.setAnimationLoop(this.animate.bind(this)); // 设置动画循环

    this.addBox(); // 添加立方体

    // 监听窗口大小变化
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  // 窗口大小变化处理函数
  private onWindowResize() {
    // 更新相机宽高比
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    // 更新渲染器大小
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // 添加一个立方体到场景中
  private addBox() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // 顶点着色器：处理顶点位置和UV坐标
    const vertexShader = `
      // 传递UV坐标到片段着色器
      varying vec2 vUv;
      
      void main() {
        // 将原始UV坐标传递给片段着色器
        vUv = uv;
        
        // 计算顶点的最终位置（投影、模型视图变换）
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // 片段着色器：实现自定义轮廓渲染效果
    const fragmentShader = `
      // 统一变量：边缘颜色、填充颜色、边缘厚度
      uniform vec3 uEdgeColor;       // 轮廓线颜色
      uniform vec3 uFillColor;       // 内部填充颜色
      uniform float uEdgeThickness;  // 轮廓线厚度
      
      // 从顶点着色器接收的UV坐标
      varying vec2 vUv;
      
      void main() {
        // 计算到边缘的最小距离
        // 分别计算左右、上下边缘的距离
        vec2 edgeDistance = min(
          vec2(vUv.x, 1.0 - vUv.x),  // 左右边缘距离
          vec2(vUv.y, 1.0 - vUv.y)   // 上下边缘距离
        );
        
        // 使用smoothstep创建平滑的边缘过渡效果
        // 当像素接近边缘时，逐渐过渡到边缘颜色
        float edge = smoothstep(
          0.0,                       // 起始过渡点
          uEdgeThickness,            // 结束过渡点
          min(edgeDistance.x, edgeDistance.y)  // 最小边缘距离
        );
        
        // 判断是否为边缘区域
        if (edge < uEdgeThickness) {
          // 渲染边缘颜色
          gl_FragColor = vec4(uEdgeColor, 1.0);
        } else {
          // 渲染内部填充颜色
          gl_FragColor = vec4(uFillColor, 1.0);
        }
      }
    `;

    // 创建自定义着色器材质
    const material = new THREE.ShaderMaterial({
      vertexShader, // 顶点着色器
      fragmentShader, // 片段着色器
      uniforms: {
        uEdgeColor: { value: new THREE.Color(0x000000) }, // 黑色轮廓
        uFillColor: { value: new THREE.Color(0xff0000) }, // 红色填充
        uEdgeThickness: { value: 0.05 }, // 轮廓线厚度
      },
    });

    // 创建网格并添加到场景
    this.box = new THREE.Mesh(geometry, material);
    this.scene.add(this.box);
  }

  // 动画函数，更新控制器并渲染场景
  private animate() {
    // 更新控制器
    this.controls.update();

    // 渲染场景
    this.renderer.render(this.scene, this.camera);
  }
}

// vec2 edgeDistance = min(
//   vec2(vUv.x, 1.0 - vUv.x),  // 左右边缘距离
//   vec2(vUv.y, 1.0 - vUv.y)   // 上下边缘距离
// );
// 这个的算法逻辑是什么样的

// 这段GLSL代码的目的是计算当前片元到最近的边缘（左、右、上、下）的距离。我们来一步步分析这个代码：

// 1.计算左右边缘距离：
// vUv.x：当前片元的横坐标（U坐标）。
// 1.0 - vUv.x：到右边缘的距离（因为U坐标范围是0到1，所以1减去当前U坐标就是到右边缘的距离）。
// vec2(vUv.x, 1.0 - vUv.x)：创建一个二维向量，分别表示到左边缘和右边缘的距离。

// 2.计算上下边缘距离：
// vUv.y：当前片元的纵坐标（V坐标）。
// 1.0 - vUv.y：到下边缘的距离（因为V坐标范围是0到1，所以1减去当前V坐标就是到下边缘的距离）。
// vec2(vUv.y, 1.0 - vUv.y)：创建一个二维向量，分别表示到上边缘和下边缘的距离。

// 3.取最小值：
// min(vec2(vUv.x, 1.0 - vUv.x), vec2(vUv.y, 1.0 - vUv.y))：比较两个向量的对应分量，取较小的值。
// 结果是一个二维向量vec2 edgeDistance，其中：
// edgeDistance.x表示到左右边缘中较近的那个边缘的距离。
// edgeDistance.y表示到上下边缘中较近的那个边缘的距离。

// 举例说明：

// 假设当前片元的UV坐标为vUv = vec2(0.3, 0.7)：

// 到左边缘的距离：vUv.x = 0.3
// 到右边缘的距离：1.0 - vUv.x = 0.7
// 到上边缘的距离：vUv.y = 0.7
// 到下边缘的距离：1.0 - vUv.y = 0.3

// 计算最小值：

// min(0.3, 0.7) = 0.3（左右边缘中较近的是左边缘）
// min(0.7, 0.3) = 0.3（上下边缘中较近的是下边缘）

// 因此，edgeDistance = vec2(0.3, 0.3)。

// 应用场景：
// 这个计算通常用于实现边缘检测、边缘高亮、边缘模糊等效果。通过知道当前片元到最近边缘的距离，可以对边缘附近的片元进行特殊处理，例如增加亮度、改变颜色、应用模糊等。
// 总之，这段代码通过计算当前片元到最近的左右和上下边缘的距离，为实现各种基于边缘的视觉效果提供了基础。

// float edge = smoothstep(
//   0.0,                       // 起始过渡点
//   uEdgeThickness,            // 结束过渡点
//   min(edgeDistance.x, edgeDistance.y)  // 最小边缘距离
// );
// 这个的算法逻辑是什么样的

// 这段GLSL代码使用smoothstep函数来计算一个边缘过渡值，该值表示当前片元是否接近边缘以及接近的程度。我们来一步步分析这个代码：

// smoothstep函数：

// smoothstep是一个平滑过渡函数，它在两个指定的值之间进行平滑插值。

// 函数原型：smoothstep(float edge0, float edge1, float x)，其中：
// edge0：起始过渡点。
// edge1：结束过渡点。
// x：需要进行平滑插值的值。

// 参数解释：
// 0.0：起始过渡点，表示距离边缘0的距离。
// uEdgeThickness：结束过渡点，表示距离边缘的厚度，通常是一个小的正数，用于控制边缘过渡的宽度。
// min(edgeDistance.x, edgeDistance.y)：最小边缘距离，表示当前片元到最近的边缘的距离。

// 计算逻辑：
// min(edgeDistance.x, edgeDistance.y)找到当前片元到最近的边缘的距离。
// smoothstep(0.0, uEdgeThickness, min(edgeDistance.x, edgeDistance.y))根据这个距离计算一个平滑的过渡值。
// 当min(edgeDistance.x, edgeDistance.y)小于uEdgeThickness时，edge值会从0平滑过渡到1。
// 当min(edgeDistance.x, edgeDistance.y)等于0时，edge值为0。
// 当min(edgeDistance.x, edgeDistance.y)等于uEdgeThickness时，edge值为1。

// 举例说明：
// 假设uEdgeThickness = 0.05，当前片元的UV坐标为vUv = vec2(0.3, 0.7)，我们已经计算出edgeDistance = vec2(0.3, 0.3)：
// min(edgeDistance.x, edgeDistance.y) = 0.3
// smoothstep(0.0, 0.05, 0.3) = 1.0（因为0.3大于0.05，所以edge值为1）

// 应用场景：
// 这个计算通常用于实现边缘高亮、边缘模糊、边缘检测等效果。通过smoothstep函数，可以平滑地过渡边缘附近的片元，避免硬边，增加视觉效果的自然度。
// 总之，这段代码通过smoothstep函数计算一个平滑的边缘过渡值，该值可以用于实现各种基于边缘的视觉效果。
