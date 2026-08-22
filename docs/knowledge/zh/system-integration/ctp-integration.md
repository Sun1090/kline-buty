---
title: 10 · CTP 对接实战：从零到能下单
description: CTP期货接口实战全流程，从环境准备、开发流程到最小可运行示例与常见坑。
---

# 10 · CTP 对接实战：从零到能下单

> 上一篇讲了 FIX，这一篇讲国内期货的「事实标准」——CTP。它是国内绝大多数量化团队、软件公司最常打交道的接口：C++ DLL、回调模型、GBK 编码、认证 + 双登录……每一步都有坑。
>
> 本篇按真实项目的推进顺序走一遍：CTP 是什么 → 环境准备 → 开发流程 → 关键调用约定 → 流控 → 连接管理 → 最小可运行示例 → 常见坑。

---

## 1. CTP 是什么

CTP（Comprehensive Transaction Platform，综合交易平台）由**上期技术（上海期货信息技术有限公司）**研发，是**国内期货市场事实标准的交易与行情接口**：

| 事实 | 内容 |
|---|---|
| 开发商 | 上期技术（上期所旗下技术公司） |
| 地位 | 国内期货公司柜台最普及的接口，市场占有率最高，事实标准 |
| 服务对象 | 期货公司/软件公司，不直接面对散户（散户用期货公司的交易软件） |
| 接口形态 | 原生 C++ 动态链接库（Windows DLL / Linux so），导出交易（Trader）与行情（MD）两类 API |
| 官方文档 | 接口头文件（`.h`）与文档需通过期货公司申请，签保密协议；版本迭代后字段以官方头文件为准 |
| 衍生品 | CTPMini（简化版）、SPT（易盛系类似物）等，行为与字段有差异，以各自文档为准 |

**API 形态：C++ DLL + 语言封装**

- 官方只发 C++ 接口；业界用 C#/Java/Python 封装（开源方案如 `ctp-python`、各家公司的内部封装），封装层本质上只是「DLL 导出函数的桥接」。
- 封装版本必须与柜台实际版本严格对应——**版本不匹配是 CTP 对接最常见的第一类问题**（结构体长度、字段增删全部对不上）。
- 行情接口与交易接口是**两个独立对象、两套连接**：`CThostFtdcMdApi`（行情）+ `CThostFtdcTraderApi`（交易），各自 Login、各自回调。

> 与 FIX 的定位对比：FIX 是「文本 + 字典」的行业标准协议，CTP 是「私有二进制结构体 + 回调」的专有接口。CTP 的优点是集成简单（拿到 DLL 就能调），缺点是一切行为以官方实现为准——文档看不到的细节只能靠实测。

---

## 2. 环境准备

### 2.1 接口下载与版本选择

| 项目 | 说明 |
|---|---|
| 官方接口 | 通过期货公司技术部申请获取（多数期货公司网站有「程序化交易」专区）；上期技术官网亦提供部分资料 |
| 版本选择 | 确认期货公司柜台版本后选择对应 API 版本；升级柜台需同步升级 API，**禁止混用** |
| 测试版 vs 生产版 | 仿真（simnow）与生产接口通常版本一致，地址不同 |

### 2.2 生产环境与仿真环境（SimNow）

| 环境 | 用途 | 获取方式 | 特点 |
|---|---|---|---|
| 生产环境 | 实盘交易 | 通过期货公司开户 + 申请交易/行情权限 + AppID | 真实资金；监控严格（异常交易行为、撤单率）；**严禁用于联调** |
| SimNow（上期技术仿真） | 开发联调、策略验证 | 官网注册仿真账号 | 行情为真实仿真行情，撮合规则近似实盘；资金虚拟；**接口行为与生产一致，但延迟/限频/撮合深度有差异** |
| 期货公司仿真柜台 | 针对公司柜台的联调 | 向期货公司申请 | 更接近生产柜台行为，部分公司提供 |

> 铁律：**所有开发、联调、回归测试都在仿真环境做；生产账号只做上线前的最终验证。** SimNow 有一个重要细节：每日收盘后到次日开盘前的时段不可用（非 7×24），自动化脚本要处理「非交易时段连接失败」的返回。

### 2.3 认证信息与版本差异

- **认证三件套**：期货公司分配的 `AppID`、`AuthCode`，加上期货公司给出的交易/行情服务器地址与端口、投资者账号与密码。
- **接口版本差异**：不同版本中，认证流程、`OnRspAuthenticate` 之后的登录顺序、字段命名都可能不同；部分柜台用新交易接口（如 `v6.x`），少数老柜台仍用旧版——**一切以你拿到的头文件为准**。

> 业内俗称的「trade/quote 接口」与「md/trader 接口」指的是同一事物的不同叫法：`TraderApi`（交易/下单/查询）+ `MdApi`（行情）。前者完成认证→登录→查询→下单→回报，后者完成行情登录→订阅。

---

## 3. 开发流程

标准流程（每一步都有对应的请求函数与回调）：

```text
① 初始化：创建 MdApi / TraderApi 实例，注册回调，连接服务器
        │
        ▼
② 认证：ReqAuthenticate（AppID + AuthCode）──▶ OnRspAuthenticate
        │
        ▼
③ 登录：ReqUserLogin（交易/行情各自登录）──▶ OnRspUserLogin
        │
        ▼
④ 结算单确认（交易侧）：ReqSettlementInfoConfirm ──▶ OnRspSettlementInfoConfirm
        │
        ▼
⑤ 查询：ReqQryInstrument / ReqQryTradingAccount / ReqQryInvestorPosition
        │    （查询结果走 OnRspQry* 回调；当日委托/成交走 OnRtnOrder/OnRtnTrade 或查询回调）
        ▼
⑥ 行情：ReqSubscribeMarketData（订阅合约）──▶ OnRtnDepthMarketData（tick 流）
        │
        ▼
⑦ 下单：ReqOrderInsert ──▶ OnRspOrderInsert（请求受理与否）
        │                      └─▶ OnRtnOrder（订单状态）/ OnRtnTrade（成交回报）
        ▼
⑧ 撤单：ReqOrderAction ──▶ OnRtnOrder（撤单结果）/ OnRspOrderAction
```

两个容易误解的点：

- **OnRsp 系列 ≠ OnRtn 系列**：`OnRspOrderInsert` 只表示「柜台收到你的请求」（或拒绝），**不代表订单成交**；订单的真实状态在 `OnRtnOrder`，成交在 `OnRtnTrade`。

::: warning ⚠️ 报单成功不等于成交
**`OnRspOrderInsert` 只表示「柜台收到你的请求」（或拒绝），不代表订单成交。** 订单的真实状态在 `OnRtnOrder`，成交在 `OnRtnTrade`——报单成功 ≠ 成交，只看 OnRsp 就以为成交了，持仓永远对不上。
:::
- **查询类回调是分批的**：结果多时一次查询会触发多次 `OnRspQry*` 回调（带 `IsLast` 标记），必须等 `IsLast=true` 才算查完。

---

## 4. 关键结构体与调用约定

### 4.1 请求与回调的配对关系

CTP 的全部交互是「**请求（Req 前缀）→ 响应回调（OnRsp 前缀）→ 主动回报（OnRtn 前缀）**」三类：

| 类别 | 例子 | 语义 |
|---|---|---|
| 请求 | `ReqUserLogin`、`ReqOrderInsert`、`ReqOrderAction`、`ReqQryInstrument` | 客户端发起 |
| 请求响应 | `OnRspUserLogin`、`OnRspOrderInsert`、`OnRspQryInstrument` | 柜台对「请求本身」的应答（受理/拒绝） |
| 主动回报 | `OnRtnOrder`、`OnRtnTrade`、`OnRtnTradingAccount`、`OnRtnDepthMarketData` | 柜台主动推送的事件流 |

每个请求函数带一个 `CThostFtdcInputXXXField*`（输入结构体）与 `int nRequestID`（本次请求编号）；回调里带 `CThostFtdcRspXXXField*`（响应结构体）与 `CThostFtdcRspInfoField*`（错误信息，`ErrorID != 0` 表示失败）。

### 4.2 线程模型：回调在单独线程

这是 CTP 对接最重要的一个概念：

- API 内部维护自己的线程，**所有回调都在 API 内部线程上触发**——不是你的业务线程。
- **不要在回调里做耗时操作**（落库、发 HTTP、打印大日志、同步等待）：会阻塞后续全部回报，行情掉包、订单回报延迟，甚至引发柜台侧超时。
- 标准做法：**回调里只做「快速入队」，业务线程消费队列**（生产者-消费者）。回调与业务线程间共享数据必须加锁或走队列，禁止裸共享。

::: danger 💀 不要在回调里做耗时操作
**不要在回调里做耗时操作（落库、发 HTTP、打印大日志、同步等待）：会阻塞后续全部回报，行情掉包、订单回报延迟，甚至引发柜台侧超时。** 标准做法是回调里只做「快速入队」，业务线程消费队列——回调与业务线程间共享数据必须加锁或走队列，禁止裸共享。
:::

```text
CTP 回调线程 ──▶ 线程安全队列 ──▶ 业务线程（消费：落库/更新状态机/通知策略）
    （只 push）                    （处理逻辑都在这里）
```

### 4.3 常用结构体

| 结构体 | 用途 | 关键字段（以官方头文件为准） |
|---|---|---|
| `CThostFtdcReqUserLoginField` | 登录 | BrokerID、UserID、Password |
| `CThostFtdcReqAuthenticateField` | 认证 | BrokerID、UserID、AppID、AuthCode |
| `CThostFtdcInputOrderField` | 下单 | InstrumentID、ExchangeID、Direction、CombOffsetFlag、LimitPrice、VolumeTotalOriginal、OrderPriceType、TimeCondition |
| `CThostFtdcInputOrderActionField` | 撤单 | InstrumentID、OrderSysID（柜台单号）或 OrderRef + FrontID/SessionID |
| `CThostFtdcOrderField` | 订单回报 | OrderStatus、VolumeTraded、VolumeTotal、LimitPrice |
| `CThostFtdcTradeField` | 成交回报 | TradeID、Price、Volume、Direction、OffsetFlag |
| `CThostFtdcDepthMarketDataField` | 行情 tick | LastPrice、Volume、BidPrice1/2/3…、AskPrice1/2/3… |

---

## 5. 流控：查询与下单频率

CTP 的频率限制没有公开的固定数值表，以下为行业通行常识（**以官方文档与实际柜台表现为准**）：

| 操作类型 | 行业常识限频 | 说明 |
|---|---|---|
| 查询类（ReqQry*） | 约 **1 秒 1 次** | 查询太频繁会被柜台拒绝（返回流控错误码），如 ReqQryTradingAccount / ReqQryPosition |
| 下单（ReqOrderInsert） | 约 **1 秒 2 次** | 高频下单触发柜台/交易所的流控与异常交易行为监控 |
| 撤单（ReqOrderAction） | 同下单 | 撤单同样受控，且频繁报撤会被交易所盯上 |
| 行情订阅 | 有连接数/订阅数上限 | 订阅管理要复用连接、聚合订阅 |

工程对策：

- **查询排队器**：所有 ReqQry* 进同一个限速队列，串行发出，至少间隔 500ms 以上（保守 1s）。
- **下单节流器**：按品种/账户控制报单节奏；日内报撤比过高（撤单率超限）会被交易所异常交易监控预警——策略层面就要减少无效撤单。
- **错误码区分**：收到流控错误码（如「CTP: 请求过于频繁」）时退避等待，不要立即重发（重发只会更频繁）。
- 注意：**仿真（SimNow）的流控比生产更宽松**，在仿真上跑通的频率在生产上可能直接被拒——上线前用生产环境的频率参数复核。

---

## 6. 连接管理

### 6.1 断开重连

- CTP 连接没有心跳消息可用（连接断与否只能靠 `OnFrontDisconnected` 回调感知，以及行情无更新时的自检）。
- 断线后的标准流程：**清理旧连接 → 重连 → 重新认证 → 重新登录 → 重新确认结算单 → 重订阅行情 → 拉当日委托/持仓重建本地状态 → 恢复下单**。恢复下单前必须完成状态重建（详见 [04-交易接口与订单生命周期.md](order-lifecycle.md)）。
- 重连要有退避策略（如 1s/2s/5s…上限 30s），避免对柜台形成重连风暴；同一时刻只允许一个重连流程。

### 6.2 结算单确认（SettlementConfirm）

- **为什么每天首连要先确认结算单**：国内期货每日结算，结算后账户的浮动盈亏变为结存；柜台要求客户**确认当日的结算单（资金/持仓/手续费明细）后才允许交易**——这是期货公司履行告知义务的机制，柜台直接按此实现为「未确认结算单 → 拒单/拒查资金」。
- 流程：登录成功后调用 `ReqSettlementInfoConfirm`，收到 `OnRspSettlementInfoConfirm` 成功后才能继续查询资金/持仓、下单。
- 常见 bug：**只在第一次启动时确认结算单**，跨日后（新交易日）未重新确认 → 早上下单全被拒，报错「CTP: 请先确认结算单」。
- 自动化系统建议：登录 → 查询结算信息（`ReqQrySettlementInfo`）→ 确认 → 再进入业务；把「确认成功」作为前置条件写进启动状态机。

::: warning ⚠️ 只在第一次启动时确认结算单跨日后早上下单会被拒
**只在第一次启动时确认结算单，跨日后新交易日未重新确认 → 早上下单全被拒，报错「CTP: 请先确认结算单」。** CTP 柜台要求客户每日结算后确认当日的资金、持仓、手续费明细后才允许交易，跨日一定要重新走一遍结算单确认流程。
:::

---

## 7. 示例代码：Python 最小框架

> 以下为**教学用伪代码风格片段**（基于常见的 CTP Python 封装），仅演示「连接+登录+订阅+收到 tick 打印」的最小闭环，不能直接用于生产。

```python
# 教学示例：CTP 最小框架（连接 + 登录 + 订阅行情 + 打印 tick）
# 依赖：某个 CTP Python 封装（如 vnpy 底层、ctpbee 或自封装），与柜台版本匹配

class MdHandler:
    def on_front_connected(self):
        # 1. 行情端登录
        self.api.req_user_login(user_id=CFG.USER, password=CFG.PWD)

    def on_rsp_user_login(self, data, error, request_id, is_last):
        if error and error["ErrorID"] != 0:
            print("行情登录失败:", error)
            return
        # 2. 登录成功后订阅合约
        self.api.subscribe_market_data(contracts=["rb2610", "cu2610"])

    def on_rtn_depth_market_data(self, tick):
        # 3. tick 回调：仅打印（教学）；生产环境应入队，勿在此做耗时操作
        print(f"{tick.instrument_id} 最新价={tick.last_price} "
              f"买一={tick.bid_price_1}@{tick.bid_volume_1} "
              f"卖一={tick.ask_price_1}@{tick.ask_volume_1} 时间={tick.update_time}")


class TradeHandler:
    def on_front_connected(self):
        self.api.req_authenticate(app_id=CFG.APP_ID, auth_code=CFG.AUTH_CODE)

    def on_rsp_authenticate(self, data, error, request_id, is_last):
        if error and error["ErrorID"] != 0:
            print("认证失败:", error); return
        self.api.req_user_login(user_id=CFG.USER, password=CFG.PWD)

    def on_rsp_user_login(self, data, error, request_id, is_last):
        if error and error["ErrorID"] != 0:
            print("交易登录失败:", error); return
        # 每日首连必须确认结算单，否则无法交易
        self.api.req_settlement_info_confirm()

    def on_rsp_settlement_info_confirm(self, data, error, request_id, is_last):
        if error and error["ErrorID"] != 0:
            print("结算单确认失败:", error); return
        print("结算单确认成功，可以开始查询与下单")
        # 查询资金 / 持仓（注意查询限频：约 1 秒 1 次）
        self.api.req_qry_trading_account()


def main():
    md_api = create_md_api(MdHandler())      # 行情：连接行情地址
    trade_api = create_trader_api(TradeHandler())  # 交易：连接交易地址
    md_api.connect(CFG.MD_HOST, CFG.MD_PORT)
    trade_api.connect(CFG.TRADE_HOST, CFG.TRADE_PORT)
    # 生产：主线程消费回调队列、处理信号；教学示例仅挂起等待
    wait_forever()
```

配套要点（教学 → 生产的差距）：

- 回调只入队，业务在主线程消费；上面的示例直接打印只适合演示。
- 行情与交易是两套连接、两套回调，各自独立断线重连。
- 字段命名以所用封装与柜台版本的官方头文件为准（上例的字段名仅为常见映射）。

---

## 8. 常见坑清单

| # | 坑 | 表现 | 对策 |
|---|---|---|---|
| 1 | GBK 编码 | 中文合约名/错误信息乱码，日志不可读 | CTP 返回的字符串按 GBK 解码再入系统（详见 [02-交易所与柜台.md](exchanges-oms.md) 9.2） |
| 2 | 时间字段格式 | 报单时间/行情时间形如 `20260816 10:00:00` 或 `yyyymmdd-hh:mm:ss` 拼接值 | 先按官方字段定义解析，统一转时间戳存储 |
| 3 | 报单成功 ≠ 成交 | 只看 `OnRspOrderInsert` 就以为成交了，持仓对不上 | 成交只认 `OnRtnTrade`；状态认 `OnRtnOrder` |
| 4 | 撤单冲突 | 成交瞬间撤单 → 撤单失败/单已全成；重复撤单 | 撤单前判断状态（`OrderStatus` 可撤才撤）；撤单失败当异常处理 |
| 5 | 忘记每日确认结算单 | 新交易日首单被拒「请先确认结算单」 | 登录状态机强制「确认结算单成功」前置 |
| 6 | 查询无限频 | 高频 ReqQry* 被流控拒绝，重试又叠加 | 查询排队器：约 1 秒 1 次 |
| 7 | 回调里做耗时操作 | 回报/行情堆积、延迟飙升 | 回调只入队 |
| 8 | 版本不匹配 | 结构体错位、字段读成乱值、崩溃 | 封装与柜台版本严格对应 |
| 9 | 夜盘/跨日处理 | 周五夜盘算下一交易日；结算时段连接被断 | 交易日历驱动，跨日后重新确认结算单 |
| 10 | 订单号冲突 | OrderRef/ClOrdID 重复被柜台拒 | 全局自增订单号 + 重启后不重复 |

---

## 风险提示

::: warning ⚠️ 风险提示
CTP 直连是真实资金的通道，出错窗口极短：撤单冲突、状态错乱、跨日未确认结算单、回调阻塞导致回报积压，任何一项都可能在几秒内造成不可逆损失。请务必：**开发与联调只在 SimNow/期货公司仿真环境进行，生产账号严禁联调**；生产环境必须开启报单节流、查询限频与独立风控进程；上线前完成断线重连、拒单、撤单冲突的注入测试；所有字段、限频数值、流程以官方《CTP API 接口文档》与期货公司技术规范为准，本文所述为行业通行常识。
:::
