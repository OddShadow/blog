import {defaultTheme} from "@vuepress/theme-default";
import {Theme} from "vuepress";

// https://ecosystem.vuejs.press/zh/themes/default/
export default defaultTheme({
  home: '/', // 首页路径，导航栏中 Logo 的链接，404 页面的 返回首页 链接

  colorMode: "auto",
  colorModeSwitch: true,
  externalLinkIcon: true,
  logo: null,
  logoDark: null,
  logoAlt: null,
  lastUpdated: true,

  // repo: 'vuepress/ecosystem',
  editLink: false, // 是否启用 编辑此页 链接
  editLinkPattern: '', // 用于生成 编辑此页 的链接，如果你不设置该选项，则会根据 docsRepo 配置项来推断 Pattern，但是如果你的文档仓库没有托管在常用的平台上，比如 GitHub 、 GitLab 、 Bitbucket 、 Gitee 等，那么你必须设置该选项才能使 编辑此页 链接正常工作
  docsRepo: '', // 用于生成 编辑此页 的链接，文档源文件的仓库 URL，如果你不设置该选项，则默认会使用 repo 配置项。但是如果你的文档源文件是在一个不同的仓库内，你就需要设置该配置项了
  docsBranch: 'main', // 用于生成 编辑此页 的链接，文档源文件的仓库分支
  docsDir: '', // 用于生成 编辑此页 的链接，文档源文件存放在仓库中的目录名
  // hostname: 'https://ecosystem.vuejs.press',

  // https://ecosystem.vuejs.press/zh/themes/default/config.html#sidebar
  sidebar: 'heading',
  sidebarDepth: 2,

  // NavbarLink 对象应该有一个 text 字段和一个 link 字段，还有一个可选的 activeMatch 字段。
  // NavbarGroup 对象应该有一个 text 字段和一个 children 字段，还有一个可选的 prefix 字段。 children 字段同样是一个 导航栏数组，而 prefix 会作为 导航栏数组 的路径前缀。
  // 字符串应为目标页面文件的路径。它将会被转换为 NavbarLink 对象，将页面标题作为 text ，将页面路由路径作为 link
  navbar: [
    {
      text: '首页',
      link: '/README.md',
    },
    {
      text: 'Java',
      link: '/java/JUC.md',
    },
    {
      text: 'MySQL',
      link: '/mysql/事务.md',
    },
  ],

}) as Theme
