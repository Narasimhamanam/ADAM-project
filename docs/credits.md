# Design References & Open-Source Credits

Research checked: November 2026. All component code, WebGL shaders, CSS utilities, and layout logic are original implementations written for the ADAM-1 Enhanced platform. No third-party mascot assets, proprietary brand artwork, or unlicensed code were copied.

| Project / Repository | Reference Type | License | Attribution & Utilization Note |
|:---|:---|:---|:---|
| [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | Component patterns | MIT | Accessible dialog focus trapping, button variant naming, and clean headless composition patterns. |
| [radix-ui/themes](https://github.com/radix-ui/themes) | Token system | MIT | Tokenized elevation scales, translucent overlay recipes, and accessible color pairing hierarchies. |
| [magicuidesign/magicui](https://github.com/magicuidesign/magicui) | Visual inspiration | MIT | Subtle radial background meshes and luminous edge border highlights. |
| [heroui-inc/heroui](https://github.com/heroui-inc/heroui) | UI library | Apache-2.0 | Fluid responsive button geometry and accessible status badge designs. |
| [origin-space/originui](https://github.com/origin-space/originui) | Input controls | MIT | Clean search input field compositions and segment controls. |
| [motiondivision/motion](https://github.com/motiondivision/motion) | Animation timing | MIT | Spring parameters and cubic-bezier curves for dialog enter/exit transitions. |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | Graphics API | MIT | Procedural sphere illumination and orthographic ray-sphere intersection equations adapted into GLSL fragment code. |
| [assistant-ui/assistant-ui](https://github.com/assistant-ui/assistant-ui) | AI Chat Layout | MIT | Evidence drawer separation and structured answer-first card hierarchy patterns. |
| [vercel/ai](https://github.com/vercel/ai) | Streaming UX | Apache-2.0 | Server-sent event stream parsing patterns and stop-generation UX controls. |
| [chatscope/chat-ui-kit-react](https://github.com/chatscope/chat-ui-kit-react) | Chat typography | MIT | Responsive chat bubble spacing and multi-turn message containers. |

### Additional Product Concepts Studied
- **Apple Liquid Glass Guidelines**: Specular highlight borders, backdrop blur with saturation boost (`backdrop-filter: blur(12px) saturate(115%)`), and solid fallbacks for reduced transparency.
- **Scientific Literature Assistants (PubMed, Perplexity, Semantic Scholar)**: Inline bracketed source citations `[1]`, evidence metadata cards (sample size, study type, PMID), and research disclaimers.
