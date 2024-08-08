import { defineUserConfig } from '@vuepress/cli'
import { viteBundler } from '@vuepress/bundler-vite'
import theme from "./theme"

export default defineUserConfig({
  bundler: viteBundler(),
  base: '/blog/',
  head : [],
  lang: 'zh-CN',
  title: '简单的程序员',
  description: '从入门到放弃',
  theme
})
