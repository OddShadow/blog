---
title: frp
author:
createTime: 2024/08/12 10:22:36
permalink: /article/xsvrvxlc/
---
## 概述

FRP（Fast Reverse Proxy）是一个开源的高性能反向代理服务器，主要用于内网穿透。  
它允许内网服务通过简单的配置与公网通信，解决了内网服务由于NAT或防火墙限制无法直接被外网访问的问题。

### 工作原理

FRP 主要由两个部分组成，服务端 `frps` 和 客户端 `frpc`
- 服务端 frps 部署在具有公网 IP 地址的服务器上，负责接受来自客户端的连接请求，转发数据。
- 客户端 frpc 部署在内网环境中，负责将内网服务注册到服务端，处理服务端转发的请求。

### 软件下载

FRP 项目 github 地址 https://github.com/fatedier/frp  
本文使用 0.59.0 版本，支持 windows，linux，mac 系统，https://github.com/fatedier/frp/releases/tag/v0.59.0  
无论哪个版本文件目录格式都是
```shell
frp
├── frpc # 客户端执行文件
├── frpc.toml # 客户端配置文件
├── frps # 服务端执行文件
├── frps.toml # 服务端端配置文件
└── LICENSE
```
一般一台机器只作为服务端或者客户端中一个，所以可以删除不需要的执行文件和配置文件  
老版本的 frp 使用的是 ini 格式，新版本使用的是 toml 格式，注意文件格式和参数名的变化  
在地址 https://github.com/fatedier/frp/tree/v0.59.0/conf 可以看到 ini 和 toml 所有可配置项

## win10 远程桌面控制内网穿透

远程桌面 Microsoft Remote Desktop 应该是微软最良心的软件  
win10 一般自带客户端，可以通过 `win + r`，输入 `mstsc`，快速打开  
macOS 提供了客户端，Microsoft Remote Desktop  
Android 提供了客户端，Microsoft Remote Desktop  
当然这些客户端是用于控制端，被控端只能是开启了远程控制功能的 windows 电脑

### 局域网内使用

先在局域网尝试使用远程桌面控制，保证使用没有问题  

局域网内，想要控制 windows 电脑 A
1. 首先开启 win10 远程控制
2. 查看内网 IP，比如 192.168.1.100，rdp 默认端口 3389

另一台 windows 电脑控制电脑 A 步骤
1. 快捷键 `win + r`，输入 `mstsc`
2. 输入电脑 A 内网 IP，`192.168.1.100`
3. 输入登陆账号和密码，如果登录了微软账号，需要使用微软账号密码
4. 访问成功表示电脑 A 的内网远程控制没有问题

### 使用 frp 提供内网穿透

#### 部署服务端

部署服务端 frps，首先需要一台公网服务器，比如一台某云上的公网服务器，安装的是 debian12 系统，假设公网 IP `8.8.8.8`  

```shell
cd /tmp
wget https://github.com/fatedier/frp/releases/download/v0.59.0/frp_0.59.0_linux_amd64.tar.gz
# wget -e "https_proxy=http://192.168.1.3:7890" https://github.com/fatedier/frp/releases/download/v0.59.0/frp_0.59.0_linux_amd64.tar.gz
tar -zxvf frp_0.59.0_linux_amd64.tar.gz
mv frp_0.59.0_linux_amd64 /usr/local/frps
rm -f /usr/local/frps/frpc*
```

修改 frps.toml `vim /usr/local/frps/frps.toml` 配置文件如下
```toml
bindPort = 7000
auth.token = "输入你的随机字符密钥"
```
开放云服务器的 7000 端口用于 frps 服务，通过 token 认证  
记得开放端口防火墙和云服务器防火墙  

启动服务端  
`/usr/local/frps/frps -c /usr/local/frps/frps.toml`

#### 部署客户端

windows 电脑 A，下载 frp，https://github.com/fatedier/frp/releases/download/v0.59.0/frp_0.59.0_windows_amd64.zip  
解压后放入目录，如，`D:\frp\frp_0.59.0_windows_amd64`  
不需要服务端，删除，frps.exe，frps.toml  
修改客户端配置文件 frpc.toml
```toml
serverAddr = "8.8.8.8" # 公网服务器IP地址
serverPort = 7000 # 公网服务器 frps 端口
auth.token = "输入你的随机字符密钥" # 认证密钥

[[proxies]]
name = "001-rdp" # 名称，随意
type = "tcp"
localIP = "127.0.0.1"
localPort = 3389 # 映射出远程桌面端口 3389
remotePort = 50000 # 告诉服务器开放 50000 端口映射到本机 3389 端口
```
开放云服务器的 50000 端口用于连接本机 3389 端口  

启动客户端  
`win + r`，输入 `cmd`  
`cd D:\frp\frp_0.59.0_windows_amd64`  
`./frpc -c ./frpc.toml`  

#### 远程访问

任意客户端可以尝试连接  
另一台 windows `win + r` `mstsc`，输入 `8.8.8.8:60000`，输入账号密码即可连接  

注意事项，需要开放 frp 的 7000 端口 和 映射出去的 50000 端口防火墙  
但是云服务器的映射端口暴露很容易被攻击，曾经对公网开放几天，被暴力尝试，建议设定指定 IP 白名单  
另外，文件的传输速度受限于公网服务器的水管速度

### 使用 xtcp 提供内网穿透

frp 提供了 xtcp，P2P 的点对点传输，传输速度不受限于公网服务器水管速度，极大提升远程桌面体验  
但是控制端也需要部署 frpc，并且对一些网络环境不适用  

公网服务器配置如下
```toml
bindPort = 7000
kcpBindPort = 7000
auth.token = "输入你的随机字符密钥"
```

被控客户端配置文件 frpc.toml  
001-rdp 的配置可以删除，可以保留  
保留的原因是如果用安卓手机控制，手机端无法部署 frpc，只能用 001-rdp 的方式  
最新版本已经可以支持安卓
```toml
serverAddr = "8.8.8.8" # 公网 IP
serverPort = 7000 # 公网服务端端口
auth.token = "输入你的随机字符密钥" # 认证密钥

[[proxies]]
name = "001-rdp" # 名称，随意
type = "tcp"
localIP = "127.0.0.1"
localPort = 3389 
remotePort = 50000

[[proxies]]
name = "001-rdp-stcp" # 名称，随意
type = "xtcp"
secretKey = "一串用于连接该服务的随机字符密钥"
localIP = "127.0.0.1"
localPort = 3389
```  

控制端客户端配置文件 frpc.toml  
```toml
serverAddr = "8.8.8.8"
serverPort = 7000
auth.token = "输入你的随机字符密钥"

[[visitors]] # 注意
name = "001-rdp-stcp-visitor" # 名称，随意
type = "xtcp"
serverName = "001-rdp-stcp" # 与被控端一致
secretKey = "一串用于连接该服务的随机字符密钥" # 与被控端一致
bindAddr = "127.0.0.1"
bindPort = 50000 # 本地使用端口，记得检查没有端口冲突
keepTunnelOpen = true
```
控制端尝试连接  
一台 windows `win + r` `mstsc`，输入 `127.0.0.1:50000`，输入账号密码即可连接

## 可选配置项

注意选择对应版本号  
`./frpc verify -c ./frpc.toml` 验证配置文件正确性   
`./frps verify -c ./frps.toml` 验证配置文件正确性

https://github.com/fatedier/frp/blob/dev/conf/frps_full_example.toml

https://github.com/fatedier/frp/blob/dev/conf/frpc_full_example.toml

```toml
# 日志输出，frpc 同理
log.to = "./logs/frps.log" # console or real logFile path
log.level = "info" # trace, debug, info, warn, error
log.maxDays = 3 # 最大天数
log.disablePrintColor = false # 控制台输出日志时是否禁用彩色输出
```

进入目录 `/usr/local/frps` 执行 `./frps -c ./frps.toml &` 即可

```toml
# 网页端 Dashboard
webServer.addr = "127.0.0.1" # 非本机访问可以修改成 "0.0.0.0"
webServer.port = 7500
webServer.user = "admin" # 账号密码
webServer.password = "admin"

# prometheus 监控数据
# 地址 http://{dashboard_addr}/metrics
# 只支持 frps
enablePrometheus = true 
```
也可以使用 systemd 管理

```shell
# /lib/systemd/system/frps.service
[Unit]
Description=FRP Server Daemon
After=network.target
Wants=network.target

[Service]
Type=simple
# 注意修改路径
ExecStart=/usr/local/frps/frps -c /usr/local/frps/frps.toml
Restart=always
RestartSec=20s
User=nobody

[Install]
WantedBy=multi-user.target
```

```shell
# /lib/systemd/system/frpc.service
[Unit]
Description=FRP Client Daemon
After=network.target
Wants=network.target

[Service]
Type=simple
# 注意修改路径
ExecStart=/usr/local/frp/frpc -c /usr/local/frp/frpc.toml
Restart=always
RestartSec=20s
User=nobody

[Install]
WantedBy=multi-user.target
```

```shell
# 如果配置成 systemd 服务，需要掌握的一些常用命令
# 日志被 journal 代理，没找到存两份的方法，可以不用在 toml 中配置
# 使用 systemd 启动，如果已经用 ./frps -c ./frps.toml & 启动，记得 kill

systemctl status frps # 状态
systemctl start frps # 启动
systemctl stop frps # 停止
systemctl enable frps # 开机自启
systemctl disable frps # 禁止开机自启
systemctl restart frps # 重启
systemctl daemon-reload # 重载 frps.service 配置文件

# frp 自带日志失效，被 journal 管理
journalctl -u frps
journalctl -u frps -f
journalctl -u frps -r

# 从某时间开始，默认时分秒 00:00:00
journalctl -u frps --since '2000-01-01'
journalctl -u frps -S '2000-01-01'
journalctl -u frps --since '2000-01-01 12:01:01'
# 截止某时间结束，默认时分秒 00:00:00
journalctl -u frps --until '2050-01-01'
journalctl -u frps -U '2050-01-01'
journalctl -u frps --until '2050-01-01 12:01:01'
# 可以不写日期，默认当天，可以一起使用，还可以用 yesterday today

journalctl --disk-usage # 查看日志大小
journalctl --vacuum-time=30d # 清理30天之前的日志
```

## windows 一般利用任务计划程序设置开机自启动

有时间再补充
