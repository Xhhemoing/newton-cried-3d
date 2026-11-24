(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ReplyCardEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA_VERSION = 1;
  var ARCHIVE_MAX_BYTES = 2000;
  var ARCHIVE_MAX_ITEMS = 8;

  var L1_SCENARIOS = {
    boss_weekend: {
      id: 'boss_weekend',
      tag: '职场修罗场 · 首发主卡',
      sender: '周六 22:47 · 老板',
      incomingText: '“在吗？那个方案周一早会要，今晚顺手改一版发我”',
      meterLabels: { bonus: '💰 年终奖保住率', health: '🫀 乳腺畅通度' },
      initialMeters: { bonus: 72, health: 28 },
      round1Choices: [
        {
          id: 'mild',
          tier: 'mild',
          label: '🟢 卑微保命版',
          subtitle: '先保饭碗 · 微微心梗',
          stanceTag: '保命妥协派',
          reply: '老板我在！刚看到消息，我这就打开电脑先看看您标出来的那几页需要调哪里？',
          meterDelta: { bonus: 16, health: -18 },
          recalledNotice: '老板撤回了一条消息',
          opponentCounter: '“不用细改，顺手把后5页数据也拉齐一下呗，辛苦~”',
          opponentInnerOS: 'OS：果然一叫就应！顺便把下周那五页也塞给他算了。',
          round2Choices: [
            {
              id: 'scope_bleed_stop',
              label: '发范围清单止血',
              stanceLabel: '绝地反锁边界派',
              meterDelta: { bonus: -4, health: 32 },
              finalReply: '收到！后5页数据源周一早才更新，今晚我先把前2页框架改完发您，其余明早数据一出立刻补齐？',
              opponentFinalOS: 'OS：行吧，连数据源更新节点都搬出来了，再逼也挤不出来。',
              damageTag: '止血成功 +32%',
              badge: '卑微止血侠',
              receiptNote: '退一步后用客观卡点锁死增量需求',
              demoRatioLabel: '演示样例：24% 选了卑微保命止血',
              commentBait: '你会直接改后5页，还是用数据源卡点止血？'
            },
            {
              id: 'fake_lag_morning',
              label: '装网卡先约明早',
              stanceLabel: '离线缓兵排期派',
              meterDelta: { bonus: -6, health: 38 },
              finalReply: '老板我这边家里的网刚抽风传不动大文件，我本地改完核心页，明早8点半准时给您发邮箱！',
              opponentFinalOS: 'OS：半夜确实不好远程盯进度…算了明早八点半看邮件吧。',
              damageTag: '脱身成功 +38%',
              badge: '断网太极手',
              receiptNote: '给台阶保敬业人设，夺回周末睡眠权',
              demoRatioLabel: '演示样例：18% 选择缓兵约明早',
              commentBait: '周六十一点被叫改PPT，你敢不敢说明早发？'
            }
          ]
        },
        {
          id: 'taiji',
          tier: 'taiji',
          label: '🟡 滴水不漏太极版',
          subtitle: '体面拉扯 · 双条稳控',
          stanceTag: '稳健控局派',
          reply: '老板收到！我目前在外没带电脑，手头还有周一要交的A表，您看这版紧急程度咱优先排哪块？',
          meterDelta: { bonus: 8, health: 24 },
          recalledNotice: '',
          opponentCounter: '“老板明早9点就要看框架，今晚能先出个初版吗？”',
          opponentInnerOS: 'OS：好家伙把优先级踢回给我了…那我只能降标准要初版。',
          round2Choices: [
            {
              id: 'core_one_page',
              label: '只保核心1页',
              stanceLabel: '精准拆弹太极派',
              meterDelta: { bonus: 6, health: 22 },
              finalReply: '明白！那我回去后先用30分钟把核心结论1页摘要发您过目，其余配图周一开会前1小时定稿。',
              opponentFinalOS: 'OS：只要核心1页能顶住早会就行，这波配合度挑不出毛病。',
              damageTag: '双条稳控 +86%',
              badge: '职场太极王',
              receiptNote: '用时间置换空间，只交最小可用版本',
              demoRatioLabel: '演示样例：41% 选择稳妥太极破局',
              commentBait: '不带电脑出门算不算打工人最高级的防身术？'
            },
            {
              id: 'defer_table_a',
              label: '顺延周一A表',
              stanceLabel: '工时置换大师派',
              meterDelta: { bonus: 4, health: 28 },
              finalReply: '没问题，那我今晚切过去改这版框架，原定周一早交的A表同步顺延到周一下午，您确认下？',
              opponentFinalOS: 'OS：拿A表来换工时…确实一个人劈不成两半，批了！',
              damageTag: '边界拉满 +52%',
              badge: '工时置换师',
              receiptNote: '明码标价换优先级，拒绝白嫖隐形工时',
              demoRatioLabel: '演示样例：37% 选择工时置换',
              commentBait: '老板同时催两个活，你会不会把选择题踢回去？'
            }
          ]
        },
        {
          id: 'crazy',
          tier: 'crazy',
          label: '🔴 体面发疯版',
          subtitle: '乳腺爆表 · 幽默创飞',
          stanceTag: '幽默创飞派',
          reply: '老板您这会儿还在卷太敬业了！我刚泡完安神茶脑子进省电模式，怕改出抽象艺术吓到甲方，明早9点满血出精品行不？',
          meterDelta: { bonus: -12, health: 58 },
          recalledNotice: '老板撤回了一条消息',
          opponentCounter: '“行吧…那明早8点半前必须发我！”',
          opponentInnerOS: 'OS：本来想让他顺手全改了，被这句“抽象艺术”整不会了，先保明早八点半吧！',
          round2Choices: [
            {
              id: 'lock_9am',
              label: '顺杆敲定明早',
              stanceLabel: '幽默破局赢麻派',
              meterDelta: { bonus: 14, health: 14 },
              finalReply: '得令！明早8点半准时带着清醒脑子上线，保证比今晚半梦半醒改出来的靠谱十倍，老板早点休息！',
              opponentFinalOS: 'OS：居然还顺手赢回了我的睡眠时间…甚至有点想谢谢他。',
              damageTag: '乳腺畅通 +99%',
              badge: '已读乱回宗师',
              receiptNote: '用自黑代替硬怼，笑着把加班推到明早',
              demoRatioLabel: '演示样例：59% 选了体面发疯创飞',
              commentBait: '发这句老板真撤回了！你敢在工作群里发吗？'
            },
            {
              id: 'ask_monday_coffee',
              label: '顺手讨杯周一咖啡',
              stanceLabel: '社交牛杂护体派',
              meterDelta: { bonus: 10, health: 14 },
              finalReply: '收到！闹钟已定明早7点，明早8点半准时交卷，顺便提前预约老板周一早会一杯续命冰美式哈哈！',
              opponentFinalOS: 'OS：算了算了，一杯咖啡换一个清醒框架也不亏。',
              damageTag: '顺手赚杯咖啡',
              badge: '乳腺守护神',
              receiptNote: '把压迫感变成喜剧互动，体面且占便宜',
              demoRatioLabel: '演示样例：41% 选择反客为主讨咖啡',
              commentBait: '借坡下驴要咖啡这招，打工人学会了没有？'
            }
          ]
        }
      ]
    },
    group_ppt_freerider: {
      id: 'group_ppt_freerider',
      tag: '小组协作 · 矩阵复用卡',
      sender: '小组群 23:12 · 摆烂组员',
      incomingText: '“这周我真有事没写，提交时署名顺手带我一下呗🙏”',
      meterLabels: { bonus: '💰 表面和平度', health: '🫀 乳腺畅通度' },
      initialMeters: { bonus: 64, health: 34 },
      round1Choices: [
        {
          id: 'mild',
          tier: 'mild',
          label: '🟢 卑微保命版',
          subtitle: '留点情面 · 暗示补工',
          stanceTag: '温和提示派',
          reply: '这版页数正好差最后一页总结和排版检查，你今晚方便补一下吗？填上咱就一起交！',
          meterDelta: { bonus: 14, health: -12 },
          recalledNotice: '对方撤回了一条消息',
          opponentCounter: '“哎呀我今天实在累瘫了，老师又不看分工，你带一下能咋地~”',
          opponentInnerOS: 'OS：都给你台阶了你还真让我补，再装可怜压一压看你接不接。',
          round2Choices: [
            {
              id: 'cite_random_check',
              label: '搬老师抽查规则',
              stanceLabel: '借力制度护体派',
              meterDelta: { bonus: -4, health: 36 },
              finalReply: '主要上回老师点名按分工格随机抽人上台讲，没写记录被点到更尴尬，就3行字你5分钟填完最稳！',
              opponentFinalOS: 'OS：点名上台社死比熬夜可怕多了…行吧我爬起来填三行。',
              damageTag: '借规立界 +36%',
              badge: '制度盾牌手',
              receiptNote: '让规则替你当恶人，体面守住劳动成果',
              demoRatioLabel: '演示样例：63% 搬出随机抽查',
              commentBait: '遇到白嫖署名的队友，私聊劝还是直接群里说？'
            },
            {
              id: 'leave_last_slot',
              label: '留最低门槛活',
              stanceLabel: '精准量化派活派',
              meterDelta: { bonus: 6, health: 28 },
              finalReply: '我把封面致谢和参考链接那格给你留着，10分钟搞定填进文档就行，填完我立马打包发老师。',
              opponentFinalOS: 'OS：门槛已经低到地板上了，再不动手真说不过去。',
              damageTag: '逼出产出 +28%',
              badge: '分工精算师',
              receiptNote: '给最小可落地任务，干完才配拿署名',
              demoRatioLabel: '演示样例：37% 给最低门槛小活',
              commentBait: '留最轻的排版格换署名，你觉得算仁至义尽吗？'
            }
          ]
        },
        {
          id: 'taiji',
          tier: 'taiji',
          label: '🟡 滴水不漏太极版',
          subtitle: '群内对齐 · 阳光透明',
          stanceTag: '公开立规派',
          reply: '@全体 咱们提交前按共享文档编辑记录核对一遍署名哈，还没补模块的小伙伴今晚11点半前上传~',
          meterDelta: { bonus: -6, health: 38 },
          recalledNotice: '',
          opponentCounter: '“能不能私下先帮我挂上，我下周一定多写两倍！”',
          opponentInnerOS: 'OS：居然直接在群里艾特全体，我先画个下周大饼试试水。',
          round2Choices: [
            {
              id: 'doc_log_only',
              label: '按文档日志走',
              stanceLabel: '客观留痕铁面派',
              meterDelta: { bonus: 4, health: 28 },
              finalReply: '这次模板末页会自动带出最近编辑人名单，系统按记录导出，你今晚随便补充一页数据就能同步带进去了！',
              opponentFinalOS: 'OS：连系统自动导出都搬出来了，不敲两行字真挂不上名字。',
              damageTag: '逻辑封喉 +66%',
              badge: '日志铁面官',
              receiptNote: '不争态度只看系统日志，零内耗解决白嫖',
              demoRatioLabel: '演示样例：56% 搬出文档编辑日志',
              commentBait: '用编辑日志定署名，这波操作太丝滑了！'
            },
            {
              id: 'swap_next_week',
              label: '下周先交再补签',
              stanceLabel: '期货拒收现结派',
              meterDelta: { bonus: 6, health: 22 },
              finalReply: '那咱就更公平点：这周按已写名单交，下周大头全交给你主导署名排第一，这样对全组都交代得过去！',
              opponentFinalOS: 'OS：想赊账结果当场现结了…行吧下周我还真得写。',
              damageTag: '拒收大饼 +60%',
              badge: '期货拒收王',
              receiptNote: '不吃口头画饼，当场按周现结最稳',
              demoRatioLabel: '演示样例：44% 选择拒收画饼',
              commentBait: '“下周我一定多写”这种话你信过几次？'
            }
          ]
        },
        {
          id: 'crazy',
          tier: 'crazy',
          label: '🔴 体面发疯版',
          subtitle: '微笑反杀 · 公开处刑',
          stanceTag: '魔法对轰派',
          reply: '没问题呀！署名栏我写“精神支柱兼锦鲤顾问”，老师问起贡献我就说你在背后默默给我们发了十个大拇指🙏',
          meterDelta: { bonus: -18, health: 62 },
          recalledNotice: '对方撤回了一条消息',
          opponentCounter: '“别别别写这么抽象！我现在开电脑补两页行了吧！”',
          opponentInnerOS: 'OS：求求你别写“锦鲤顾问”，我这就爬起来写两页！',
          round2Choices: [
            {
              id: 'countdown_doc',
              label: '甩出共享文档',
              stanceLabel: '发疯逼出生产力派',
              meterDelta: { bonus: 14, health: 4 },
              finalReply: '哈哈开玩笑的，第6页空白舞台已为你聚光，等你大作落笔我给你把名字置顶加粗！',
              opponentFinalOS: 'OS：被幽默架在火上烤，反而不好意思不写了。',
              damageTag: '队友诈尸 +99%',
              badge: '整活催更神',
              receiptNote: '用荒诞头衔吓醒装睡队友，效率翻倍',
              demoRatioLabel: '演示样例：71% 用魔法打败白嫖',
              commentBait: '“精神支柱兼锦鲤顾问”笑不活了，全网抄作业！'
            },
            {
              id: 'split_role_meme',
              label: '顺便派个答辩活',
              stanceLabel: '端水闭环宗师派',
              meterDelta: { bonus: 10, health: 4 },
              finalReply: '太好了！那这页写完正好下周上台汇报C位归你，写稿的坐台下给你疯狂鼓掌，分工完美！',
              opponentFinalOS: 'OS：写两页还得上台讲…算了我老老实实写完干正事。',
              damageTag: '反客为主 +95%',
              badge: '反向画饼王',
              receiptNote: '把虚头巴脑变成实打实任务，绝不吃亏',
              demoRatioLabel: '演示样例：29% 反向派答辩C位',
              commentBait: '白嫖署名的人最怕什么？最怕你把上台汇报塞给他！'
            }
          ]
        }
      ]
    },
    relative_marriage: {
      id: 'relative_marriage',
      tag: '过年破冰 · 泛娱乐扩圈卡',
      sender: '相亲相爱一家人 · 二姨',
      incomingText: '“隔壁表哥二胎都满月了，你今年过年带对象回家不？”',
      meterLabels: { bonus: '💰 红包安全率', health: '🫀 乳腺畅通度' },
      initialMeters: { bonus: 60, health: 38 },
      round1Choices: [
        {
          id: 'mild',
          tier: 'mild',
          label: '🟢 卑微保命版',
          subtitle: '乖巧装傻 · 先保红包',
          stanceTag: '乖巧兜圈派',
          reply: '恭喜表哥！我这边缘分还在加载中，今年主要专心搞钱攒福气，回头沾沾小侄子的喜气呀！',
          meterDelta: { bonus: 18, health: -8 },
          recalledNotice: '',
          opponentCounter: '“搞啥钱呀，二姨手头正有个条件特好的，腊月安排你们见一面？”',
          opponentInnerOS: 'OS：这孩子嘴还挺甜，趁热把隔壁王大妈介绍的小伙塞过去！',
          round2Choices: [
            {
              id: 'ask_redpacket_first',
              label: '先夸二姨眼光好',
              stanceLabel: '高情商绕弯派',
              meterDelta: { bonus: 12, health: 22 },
              finalReply: '二姨眼光肯定没得说！不过我年底项目天天加班到十点，怕冷落人家耽误人时间，开春忙完肯定向您报道！',
              opponentFinalOS: 'OS：还先夸我眼光好又说怕耽误别人，行吧开春再说！',
              damageTag: '保住清静 +22%',
              badge: '彩虹屁滑头',
              receiptNote: '糖衣炮弹加时间拖字诀，红包清静全都要',
              demoRatioLabel: '演示样例：49% 用糖衣炮弹脱身',
              commentBait: '过年亲戚硬安排相亲，这句“怕耽误人家”好用吗？'
            },
            {
              id: 'deflect_budget',
              label: '顺杆问相亲赞助',
              stanceLabel: '笑眯眯劝退派',
              meterDelta: { bonus: 8, health: 28 },
              finalReply: '好呀二姨，不过相亲请吃饭看电影太费银子，要不您先发个相亲启动大红包给我壮壮胆？',
              opponentFinalOS: 'OS：聊着聊着咋管我要起启动资金了…算了你忙你的吧。',
              damageTag: '瞬间降温 +28%',
              badge: '红包防身术',
              receiptNote: '轻轻一提启动资金，话题立刻丝滑转场',
              demoRatioLabel: '演示样例：51% 反要相亲启动红包',
              commentBait: '一问发不发相亲启动资金，催婚群瞬间安静了！'
            }
          ]
        },
        {
          id: 'taiji',
          tier: 'taiji',
          label: '🟡 滴水不漏太极版',
          subtitle: '礼貌转场 · 反向关心',
          stanceTag: '反向关切派',
          reply: '太喜庆了！对了二姨，您去年说想学广场舞新曲子学会没？表哥家娃满月酒定哪家酒店呀？',
          meterDelta: { bonus: 10, health: 32 },
          recalledNotice: '',
          opponentCounter: '“别岔开话题哈，你年纪也不小了心里到底咋想的？”',
          opponentInnerOS: 'OS：这孩子咋这么滑溜，一下把话头转到表哥身上了。',
          round2Choices: [
            {
              id: 'high_standard_shield',
              label: '抬出高标准挡箭牌',
              stanceLabel: '佛系尊严太极派',
              meterDelta: { bonus: 8, health: 26 },
              finalReply: '我心里门儿清着呢：宁可慢一点找个三观合、像姨夫一样疼人的，也不瞎凑合让家里人跟着操心对不？',
              opponentFinalOS: 'OS：居然还顺手夸了句姨夫疼人…这让我咋往下接？',
              damageTag: '长辈点赞 +58%',
              badge: '夸夸挡箭牌',
              receiptNote: '夸长辈婚姻立高标准，催婚变夸夸大会',
              demoRatioLabel: '演示样例：57% 选择夸姨夫挡催婚',
              commentBait: '夸“像姨夫一样疼人”，亲戚还能怎么催？'
            },
            {
              id: 'career_milestone',
              label: '用升职目标挡驾',
              stanceLabel: '正能量上进派',
              meterDelta: { bonus: 14, health: 20 },
              finalReply: '我给自己定了明年冲一波晋升，等底气更足了再风风光光带回家，到时候第一个请二姨坐主桌！',
              opponentFinalOS: 'OS：孩子这么上进还想着请我坐主桌，催两句倒显得我没格局了。',
              damageTag: '好感度 +14%',
              badge: '主桌画饼手',
              receiptNote: '用长辈最爱的上进与主桌承诺换一年清静',
              demoRatioLabel: '演示样例：43% 用明年冲晋升挡驾',
              commentBait: '过年最管用的嘴替还是这句“请您坐主桌”！'
            }
          ]
        },
        {
          id: 'crazy',
          tier: 'crazy',
          label: '🔴 体面发疯版',
          subtitle: '已读乱回 · 全家笑场',
          stanceTag: '荒诞反杀派',
          reply: '二姨您先别催，我对象昨天算命说太优秀了怕过年闪着亲戚，让我先带八个砂糖橘回来给大家拜年🍊',
          meterDelta: { bonus: 4, health: 60 },
          recalledNotice: '二姨撤回了一条消息',
          opponentCounter: '“净贫嘴！那过年记着真多提两箱砂糖橘回来哈。”',
          opponentInnerOS: 'OS：哈哈哈哈这孩子嘴太贫了，算了过年开心最重要，不催了。',
          round2Choices: [
            {
              id: 'orange_vip',
              label: '顺势锁死砂糖橘',
              stanceLabel: '欢乐收场喜剧派',
              meterDelta: { bonus: 12, health: 2 },
              finalReply: '成交！今年我拎两箱特甜砂糖橘坐C位，专门剥给表哥家小宝贝吃，保证不抢二胎风头，提前祝大吉大利！',
              opponentFinalOS: 'OS：全家人都在哈哈笑，压根记不起接着催婚的事。',
              damageTag: '全家破防笑场',
              badge: '家族气氛组',
              receiptNote: '把沉重催婚拆成群聊段子，红包还稳稳到手',
              demoRatioLabel: '演示样例：68% 用砂糖橘化解催婚',
              commentBait: '把催婚聊成拎两箱砂糖橘，群里再也没人敢接招！'
            },
            {
              id: 'quote_fortune',
              label: '反问表哥红包的份子',
              stanceLabel: '转移火力大师派',
              meterDelta: { bonus: 6, health: 2 },
              finalReply: '一定一定！不过小侄子满月大红包我也备好了，二姨记得帮我记账上，回头等我结婚双倍讨回来哈！',
              opponentFinalOS: 'OS：好家伙提前给我算起回礼账来了，机灵鬼！',
              damageTag: '反将一军 +98%',
              badge: '回礼精算鬼才',
              receiptNote: '笑着反向催回礼，把压力瞬间传回对面',
              demoRatioLabel: '演示样例：32% 反向算起回礼账',
              commentBait: '等我结婚双倍讨回来——这句学到了过年必用！'
            }
          ]
        }
      ]
    }
  };

  var PROMO_SCRIPTS = [
    {
      scenarioId: 'boss_weekend',
      title: '《周六 22:47 老板发“在吗”？千万别只回收到！》',
      hook3s: '红字暴击标题 + 屏幕震动模拟“周六 22:47 老板消息”，直接手指点选【🔴 体面发疯版】',
      timeline: [
        { sec: '0–3s', screen: '微信高仿弹窗：周六 22:47 老板发“今晚顺手改一版” + 乳腺畅通度跌到28%', caption: '周六十一点老板突然发“在吗”，打工人千万别傻傻回“收到”！' },
        { sec: '3–7s', screen: '录屏手指单击【🔴 体面发疯版】→ 弹出“老板撤回了一条消息”+ 黄色内心OS', caption: '用这个AI嘴替试了下体面发疯版，下一秒老板直接撤回了消息！' },
        { sec: '7–11s', screen: '点【顺杆敲定明早】→ 红印砸下《嘴替战绩小票》，乳腺畅通+99%', caption: '不仅幽默推到明早，还顺便出了这张战绩小票可以直接复制！' },
        { sec: '11–15s', screen: '跳进落地页输“甄嬛体、不提钱”，1秒变身古风太极话术', caption: '遇到真消息还能点左下角按你的关系改写，快去试试你会选哪档！' }
      ],
      douyinTitle: '周六22:47老板发“在吗”千万别回收到！体面发疯这招太绝了 #打工人嘴替 #职场情商 #AI兴趣卡',
      hashtags: ['#打工人嘴替', '#高情商回复', '#AI兴趣卡', '#周末不加班'],
      pinnedComment: '我刚才试了体面发疯版结果老板真撤回消息了😂 评论区聊聊：周六收到这句你敢选红牌还是乖乖保命？'
    },
    {
      scenarioId: 'group_ppt_freerider',
      title: '《小组作业白嫖署名怎么治？0内耗一句让他自己爬起来写》',
      hook3s: '23:12 群聊消息“提交时署名顺手带我一下🙏” + 对比🟢保命 vs 🔴公开处刑',
      timeline: [
        { sec: '0–3s', screen: '群聊弹窗：23:12 组员说这周没写求带署名，乳腺畅通度瞬间报警', caption: '做小组PPT遇到这种队友真的会窒息，硬怼伤感情，忍了又内伤！' },
        { sec: '3–7s', screen: '点【🔴 体面发疯版】直接写“精神支柱兼锦鲤顾问”→ 对方瞬间撤回', caption: '看我点这个发疯版，直接给挂名成锦鲤顾问，对面当场慌了！' },
        { sec: '7–11s', screen: '再点【甩出共享文档】→ 盖章【整活催更神】+ 全群喜剧小票', caption: '两下就把装睡队友逼出来干活了，还完全不伤表面和气！' },
        { sec: '11–15s', screen: '切落地页输入“对方是室友、不提以前黑历史”，生成专属话术', caption: '真遇到棘手情况还能进落地页按关系改写，点左下角卡片自测！' }
      ],
      douyinTitle: '遇到白嫖署名的组员别忍了！这句“锦鲤顾问”直接让队友连夜诈尸 #大学生活 #小组作业 #AI嘴替',
      hashtags: ['#小组作业', '#大学生避坑', '#高情商反击', '#AI兴趣卡'],
      pinnedComment: '“精神支柱兼锦鲤顾问”这段位太高了🤣 遇到白嫖队友你会私聊劝还是直接在群里点？'
    },
    {
      scenarioId: 'relative_marriage',
      title: '《过年二姨催婚怎么破？带八个砂糖橘回家直接让全场笑裂》',
      hook3s: '“相亲相爱一家人”红字警报 + 二姨灵魂拷问“隔壁表哥二胎都满月了”',
      timeline: [
        { sec: '0–3s', screen: '家族群弹窗：二姨问今年带对象回家不？红包安全率60%', caption: '过年最怕家族群突然点名催婚！答不好清静和红包一起没！' },
        { sec: '3–7s', screen: '单击【🔴 体面发疯版】→ 二姨撤回催婚消息 + 笑场OS弹窗', caption: '试了下嘴替卡里的砂糖橘话术，直接把催婚局改成拜年喜剧！' },
        { sec: '7–11s', screen: '点【反问表哥份子】→ 盖章【回礼精算鬼才】战绩小票', caption: '不但没冷场，顺手把压力全推回对面，长辈还夸嘴甜！' },
        { sec: '11–15s', screen: '点进落地页输入“客气点、别提工资”，3秒定制专属长辈话术', caption: '过年防身就靠这张卡了，点左下角测测你的嘴替段位！' }
      ],
      douyinTitle: '二姨问过年带对象回家不，用AI嘴替回完整个家族群都安静了哈哈 #过年催婚 #高情商 #AI小工具',
      hashtags: ['#过年催婚', '#亲戚语录', '#社恐嘴替', '#AI兴趣卡'],
      pinnedComment: '问相亲发不发启动红包那条简直天才😂 大家遇到催婚一般选太极绕弯还是发疯创飞？'
    }
  ];

  var MOCK_COMMENTS = {
    boss_weekend: [
      { user: '深夜改PPT人', badgeTag: '已读乱回宗师', text: '“怕改出抽象艺术吓到甲方”笑死我了，昨天差点真发出去哈哈哈', likes: 412 },
      { user: '打工人小陈', badgeTag: '职场太极王', text: '正经说！太极版拿A表换工时那句太实用了，收藏码住周一真用得上', likes: 268 },
      { user: '摸鱼协会会长', badgeTag: '断网太极手', text: '@李哥 下回老板周六喊你别再回“收到”了，快看这张卡', likes: 159 }
    ],
    group_ppt_freerider: [
      { user: '期末赶DDL选手', badgeTag: '整活催更神', text: '锦鲤顾问那个给我笑岔气了，刚发小群里试了一下，组员3分钟后立马在文档里打字了', likes: 523 },
      { user: '老实人自救中', badgeTag: '日志铁面官', text: '按文档编辑记录导出真的绝杀，谁干活谁不干活一句话不说清清楚楚', likes: 304 },
      { user: '早八绝缘体', badgeTag: '制度盾牌手', text: '@宿舍小张 看第二轮那句抽查规则，太体面了完全不得罪人', likes: 118 }
    ],
    relative_marriage: [
      { user: '砂糖橘批发商', badgeTag: '家族气氛组', text: '带八个砂糖橘拜年笑喷了，今年过年就按小票上的背诵全文！', likes: 389 },
      { user: '冷静小王', badgeTag: '夸夸挡箭牌', text: '顺手夸姨夫疼人那句段位极高，长辈听了开心还接不上催婚', likes: 215 },
      { user: '压岁钱守护者', badgeTag: '红包防身术', text: '@表妹 过年回家前先测一遍，保住红包全靠它了', likes: 147 }
    ]
  };

  var FUNNEL_DIAGNOSIS = [
    {
      id: 'cold_start_low_views',
      label: '播放破不了 500',
      threshold: '冷启动曝光 < 500',
      cause: '宣发视频前3秒像软件说明书（“大家好我做了一个AI…”），观众没看清冲突就划走了。',
      v2Fix: '只改视频前3秒：砍掉自我介绍，第一帧直接大红字+震动展示“周六22:47老板发在吗”+手指按下🔴发疯版。'
    },
    {
      id: 'low_first_tap',
      label: '卡内首触率 < 10%',
      threshold: '进卡后3秒内无点击',
      cause: '首屏文字太密或看起来像问卷/菜单，用户懒得读；或按钮落入右侧/底部避让区误触切流。',
      v2Fix: '只改首屏钩子：打开安全区参考线，压短消息气泡到22字内，放大3枚火力技能卡对比色差。'
    },
    {
      id: 'low_r2_complete',
      label: '选完1轮就划走',
      threshold: '第2轮完成率 < 50%',
      cause: '第一轮就给完普通话术，没有“对方反扑+撤回+内心OS”制造反转悬念，看完一笑即走。',
      v2Fix: '只改第1轮反扑句：把对方反问改得更嘴硬真实（如“顺便把后5页也改了吧”），强逼出第2轮终极反杀。'
    },
    {
      id: 'low_l2_jump',
      label: '小票好看不进落地页',
      threshold: 'L2 二跳率 < 8%',
      cause: '跳转按钮写得像“了解更多/查看详情”太虚，没有带着卡内选出的战绩人格继续干真活。',
      v2Fix: '只改按钮文案与延续态：改成“按我的真实对话+对方关系改写 →”，进页首屏立刻显示刚拿到的段位带入。'
    }
  ];

  function clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
  }

  function createEnvelope(opts) {
    var o = opts || {};
    return {
      v: SCHEMA_VERSION,
      scenarioId: String(o.scenarioId || 'boss_weekend'),
      sessionId: String(o.sessionId || ''),
      revision: Number(o.revision) || 1,
      kind: String(o.kind || 'state'),
      payload: o.payload !== undefined ? o.payload : null
    };
  }

  function generateId(prefix) {
    var rnd = Math.random().toString(36).slice(2, 8);
    return (prefix || 'id') + '_' + rnd;
  }

  function resolveScenarioId(scenarioId) {
    if (scenarioId === 'overtime_last_min') return 'boss_weekend';
    if (scenarioId && Object.prototype.hasOwnProperty.call(L1_SCENARIOS, scenarioId)) {
      return scenarioId;
    }
    return 'boss_weekend';
  }

  function getScenario(scenarioId) {
    return L1_SCENARIOS[resolveScenarioId(scenarioId)];
  }

  function createSession(scenarioId) {
    var sc = getScenario(scenarioId);
    return {
      sessionId: generateId('sess'),
      scenarioId: sc.id,
      revision: 1,
      phase: 'ENTRY',
      r1ChoiceId: null,
      r2ChoiceId: null,
      meters: {
        bonus: sc.initialMeters.bonus,
        health: sc.initialMeters.health
      },
      history: [],
      receipt: null
    };
  }

  function enterCard(state) {
    if (!state) {
      throw new Error('Invalid state for enterCard');
    }
    if (state.phase === 'READY') {
      return {
        sessionId: state.sessionId,
        scenarioId: state.scenarioId,
        revision: state.revision,
        phase: 'READY',
        r1ChoiceId: state.r1ChoiceId,
        r2ChoiceId: state.r2ChoiceId,
        meters: { bonus: state.meters.bonus, health: state.meters.health },
        history: state.history.slice(),
        receipt: state.receipt
      };
    }
    if (state.phase !== 'ENTRY') {
      throw new Error('Invalid state phase for enterCard: ' + state.phase);
    }
    return {
      sessionId: state.sessionId,
      scenarioId: state.scenarioId,
      revision: state.revision,
      phase: 'READY',
      r1ChoiceId: null,
      r2ChoiceId: null,
      meters: { bonus: state.meters.bonus, health: state.meters.health },
      history: [],
      receipt: null
    };
  }

  function findR1Choice(scenario, choiceId) {
    for (var i = 0; i < scenario.round1Choices.length; i++) {
      if (scenario.round1Choices[i].id === choiceId) {
        return scenario.round1Choices[i];
      }
    }
    return null;
  }

  function findR2Choice(r1Choice, choiceId) {
    if (!r1Choice) return null;
    for (var i = 0; i < r1Choice.round2Choices.length; i++) {
      if (r1Choice.round2Choices[i].id === choiceId) {
        return r1Choice.round2Choices[i];
      }
    }
    return null;
  }

  function selectRound1(state, choiceId) {
    if (!state || (state.phase !== 'READY' && state.phase !== 'ENTRY')) {
      throw new Error('Invalid state phase for round 1');
    }
    var sc = getScenario(state.scenarioId);
    var choice = findR1Choice(sc, choiceId);
    if (!choice) {
      throw new Error('Unknown round 1 choice: ' + choiceId);
    }
    var nextMeters = {
      bonus: clamp(state.meters.bonus + choice.meterDelta.bonus, 0, 100),
      health: clamp(state.meters.health + choice.meterDelta.health, 0, 100)
    };
    return {
      sessionId: state.sessionId,
      scenarioId: sc.id,
      revision: state.revision,
      phase: 'COUNTER',
      r1ChoiceId: choice.id,
      r2ChoiceId: null,
      meters: nextMeters,
      history: [
        {
          round: 1,
          choiceId: choice.id,
          tier: choice.tier,
          label: choice.label,
          stanceTag: choice.stanceTag,
          reply: choice.reply,
          recalledNotice: choice.recalledNotice || '',
          opponentCounter: choice.opponentCounter,
          opponentInnerOS: choice.opponentInnerOS,
          meterDelta: choice.meterDelta
        }
      ],
      receipt: null
    };
  }

  function selectRound2(state, choiceId) {
    if (!state || state.phase !== 'COUNTER') {
      throw new Error('Invalid state phase for round 2');
    }
    var sc = getScenario(state.scenarioId);
    var r1 = findR1Choice(sc, state.r1ChoiceId);
    var r2 = findR2Choice(r1, choiceId);
    if (!r2) {
      throw new Error('Unknown round 2 choice: ' + choiceId);
    }
    var nextMeters = {
      bonus: clamp(state.meters.bonus + r2.meterDelta.bonus, 0, 100),
      health: clamp(state.meters.health + r2.meterDelta.health, 0, 100)
    };
    var receipt = {
      scenarioId: sc.id,
      scenarioTag: sc.tag,
      sender: sc.sender,
      incomingText: sc.incomingText,
      r1ChoiceId: r1.id,
      r1Label: r1.label,
      r2ChoiceId: r2.id,
      r2Label: r2.label,
      stanceLabel: r2.stanceLabel,
      finalReply: r2.finalReply,
      opponentFinalOS: r2.opponentFinalOS,
      damageTag: r2.damageTag,
      badge: r2.badge,
      receiptNote: r2.receiptNote,
      demoRatioLabel: r2.demoRatioLabel,
      commentBait: r2.commentBait,
      aiNotice: '内容由 AI 离线预审池生成（Demo 演示）',
      meters: nextMeters
    };
    return {
      sessionId: state.sessionId,
      scenarioId: sc.id,
      revision: state.revision,
      phase: 'FINISHED',
      r1ChoiceId: r1.id,
      r2ChoiceId: r2.id,
      meters: nextMeters,
      history: state.history.concat([
        {
          round: 2,
          choiceId: r2.id,
          label: r2.label,
          stanceLabel: r2.stanceLabel,
          finalReply: r2.finalReply,
          opponentFinalOS: r2.opponentFinalOS,
          meterDelta: r2.meterDelta
        }
      ]),
      receipt: receipt
    };
  }

  function resetSession(state) {
    var sc = getScenario(state ? state.scenarioId : 'boss_weekend');
    return {
      sessionId: state ? state.sessionId : generateId('sess'),
      scenarioId: sc.id,
      revision: state ? state.revision + 1 : 1,
      phase: 'ENTRY',
      r1ChoiceId: null,
      r2ChoiceId: null,
      meters: {
        bonus: sc.initialMeters.bonus,
        health: sc.initialMeters.health
      },
      history: [],
      receipt: null
    };
  }

  function switchScenario(state, nextScenarioId) {
    var sc = getScenario(nextScenarioId);
    return {
      sessionId: state ? state.sessionId : generateId('sess'),
      scenarioId: sc.id,
      revision: state ? state.revision + 1 : 1,
      phase: 'ENTRY',
      r1ChoiceId: null,
      r2ChoiceId: null,
      meters: {
        bonus: sc.initialMeters.bonus,
        health: sc.initialMeters.health
      },
      history: [],
      receipt: null
    };
  }

  function shouldAcceptResponse(state, respRevision) {
    return Boolean(state && Number(respRevision) === state.revision);
  }

  var UNSAFE_PATTERNS = [
    /去死|杀了|砍死|打死|弄死|自杀|跳楼|爆炸/,
    /傻逼|草泥马|操你|妈的|滚蛋|贱人|废物/,
    /人肉|曝光家庭住址|曝光身份证|网暴/,
    /诈骗|洗钱|赌博|违禁品/
  ];

  function checkSafety(rawText) {
    var text = typeof rawText === 'string' ? rawText.trim() : '';
    for (var i = 0; i < UNSAFE_PATTERNS.length; i++) {
      if (UNSAFE_PATTERNS[i].test(text)) {
        return {
          ok: false,
          reason: '包含不友善、攻击性或高风险违规词汇，已触发安全阻断'
        };
      }
    }
    return { ok: true, reason: '' };
  }

  function addUnique(list, item) {
    if (item && list.indexOf(item) === -1) {
      list.push(item);
    }
  }

  function compileConstraintText(rawText) {
    var clean = typeof rawText === 'string' ? rawText.trim().slice(0, 60) : '';
    var style = 'default';
    if (/甄嬛|本宫|娘娘|小主|古风/.test(clean)) {
      style = 'zhenhuan';
    } else if (/发疯|创飞|已读乱回|抽象/.test(clean)) {
      style = 'crazy';
    } else if (/委婉|客气|温和|太极|含蓄|礼貌/.test(clean)) {
      style = 'diplomatic';
    } else if (/干脆|硬气|不背锅|直接|利落/.test(clean)) {
      style = 'crisp';
    }

    var hardBans = [];
    if (/(?:不|别|勿|禁)提(?:到)?钱|不谈钱|别谈钱/.test(clean)) {
      ['钱', '加班费', '报酬', '费用', '薪资', '补偿'].forEach(function (w) { addUnique(hardBans, w); });
    }
    if (/(?:不|别|勿|禁)提(?:到)?加班/.test(clean)) {
      addUnique(hardBans, '加班');
    }
    if (/(?:不|别|勿|禁)提(?:到)?领导|别提老板/.test(clean)) {
      addUnique(hardBans, '领导');
      addUnique(hardBans, '老板');
    }

    var genericBanRe = /[不别勿禁]提(?:到)?([^，,、。；;\s]{1,5})/g;
    var match;
    while ((match = genericBanRe.exec(clean)) !== null) {
      if (match[1] && match[1] !== '钱') {
        addUnique(hardBans, match[1]);
      }
    }

    var intents = [];
    if (/借充电宝|充电宝/.test(clean)) addUnique(intents, 'decline_borrow_powerbank');
    if (/指路|带路|路线/.test(clean)) addUnique(intents, 'offer_directions');
    if (/赶车|赶地铁|赶高铁|赶飞机|急着走/.test(clean)) addUnique(intents, 'urgent_commute');
    if (/明早|明天|改天/.test(clean)) addUnique(intents, 'defer_morning');
    if (/不背锅|甩锅|划清|边界|署名/.test(clean)) addUnique(intents, 'refuse_blame');
    if (/立刻答应|全部接下|全接下|马上答应|全都接/.test(clean)) addUnique(intents, 'accept_all');
    if (/婉拒|坚决拒绝|拒绝|不借|回绝|推掉/.test(clean)) addUnique(intents, 'decline_request');

    var conflicts = [];
    if (intents.indexOf('accept_all') !== -1 &&
       (intents.indexOf('decline_request') !== -1 || intents.indexOf('decline_borrow_powerbank') !== -1)) {
      conflicts.push({
        id: 'accept_vs_decline',
        labelA: '优先答应/缓冲承接',
        labelB: '优先婉拒/守住边界'
      });
    }

    return {
      rawTruncated: clean,
      style: style,
      hardBans: hardBans,
      intents: intents,
      conflicts: conflicts,
      needsPriorityChoice: conflicts.length > 0
    };
  }

  function validateAgainstConstraints(replyText, compiled) {
    var text = String(replyText || '');
    var safety = checkSafety(text);
    if (!safety.ok) {
      return { valid: false, violatedBans: ['SAFETY_VIOLATION'] };
    }
    var violated = [];
    var bans = (compiled && compiled.hardBans) ? compiled.hardBans : [];
    for (var i = 0; i < bans.length; i++) {
      if (bans[i] && text.indexOf(bans[i]) !== -1) {
        violated.push(bans[i]);
      }
    }
    return {
      valid: violated.length === 0,
      violatedBans: violated
    };
  }

  function stripHardBansFallback(text, compiled) {
    var out = String(text || '');
    var bans = (compiled && compiled.hardBans) ? compiled.hardBans : [];
    for (var i = 0; i < bans.length; i++) {
      if (bans[i]) {
        out = out.split(bans[i]).join('相关安排');
      }
    }
    return out;
  }

  function runL2ConstraintSandbox(opts) {
    var o = opts || {};
    var sc = getScenario(o.scenarioId);
    var r1 = findR1Choice(sc, o.r1ChoiceId) || sc.round1Choices[0];
    var r2 = findR2Choice(r1, o.r2ChoiceId) || r1.round2Choices[0];
    var baselineTemplateReply = r2.finalReply;
    var rawInput = typeof o.rawInput === 'string' ? o.rawInput : '';

    var safety = checkSafety(rawInput);
    if (!safety.ok) {
      return {
        status: 'BLOCKED_UNSAFE',
        reason: safety.reason,
        compiled: null,
        baselineTemplateReply: baselineTemplateReply,
        firstReply: '检测到高风险或不友善输入，安全护栏已阻断此次生成。',
        simulatedCounter: '（已跳过模拟推演）',
        finalReply: '建议保持克制、客观沟通事实与时间边界，避免激发不必要冲突。',
        unappliedRules: ['输入未通过内容安全审核'],
        validation: { valid: true, violatedBans: [] },
        aiNotice: '内容由 AI 生成（Demo 规则编译器演示）'
      };
    }

    var compiled = compileConstraintText(rawInput);

    if (o.simulateTimeout) {
      return {
        status: 'FALLBACK_SAFE',
        compiled: compiled,
        baselineTemplateReply: baselineTemplateReply,
        firstReply: '收到，这边刚在收尾手头事项，我先核对下时间表，稍后给你一个稳妥答复。',
        simulatedCounter: '对方追问：那大概什么时候能定下来？',
        finalReply: '目前先保核心进度不出错，其余事项顺延到明天首个时段对接，你看这样安排是否合适？',
        unappliedRules: ['3秒超时兜底：本次未应用自定义风格与附加硬约束'],
        validation: { valid: true, violatedBans: [] },
        aiNotice: '内容由 AI 生成（3s 超时安全降级演示）'
      };
    }

    if (compiled.needsPriorityChoice && !o.resolvedPriority) {
      return {
        status: 'NEEDS_PRIORITY',
        compiled: compiled,
        baselineTemplateReply: baselineTemplateReply,
        conflictPrompt: '检测到互斥硬约束：「立刻答应」与「坚决婉拒」不可同时成立，请先选定优先级：',
        priorityOptions: [
          { id: 'prefer_decline', label: '优先婉拒 · 守住边界' },
          { id: 'prefer_accept', label: '优先接下 · 但限定缓冲' }
        ],
        firstReply: '',
        simulatedCounter: '',
        finalReply: '',
        unappliedRules: [],
        validation: { valid: true, violatedBans: [] },
        aiNotice: '内容由 AI 生成（Demo 规则编译器演示）'
      };
    }

    var hasPowerbank = compiled.intents.indexOf('decline_borrow_powerbank') !== -1;
    var hasCommute = compiled.intents.indexOf('urgent_commute') !== -1;
    var hasDirections = compiled.intents.indexOf('offer_directions') !== -1;
    var hasBlame = compiled.intents.indexOf('refuse_blame') !== -1;
    var preferAccept = o.resolvedPriority === 'prefer_accept';

    var firstReply = '';
    var simulatedCounter = '';
    var finalReply = '';

    if (compiled.style === 'zhenhuan') {
      if (hasPowerbank) {
        firstReply = '这续航也忒不经用些，倒叫人左右为难；只是我这物件电量也所剩无几，实在匀不出余地了。';
        simulatedCounter = '对方追问：就借充十分钟救急，待会儿马上还你呀！';
        finalReply = '情分虽重，奈何自己也要赶路联络，实在爱莫能助；前面服务台许有便民借用，你且去问问看。';
      } else {
        firstReply = '这差事本该尽心，只是今日时辰实在紧迫，若草草落笔反倒误了正事，不如明早静心呈上？';
        simulatedCounter = '对方追问：可上头催得紧，今晚非看不可呢？';
        finalReply = '既如此，我且先把要紧之处妥帖备好，余下末节明早一早补齐，也算两全其美。';
      }
    } else if (compiled.style === 'crazy') {
      firstReply = '我现在脑细胞已开启夜间省电休眠，若强行开工恐怕产出的全是意识流草稿，还是明早清醒了出稳妥版吧！';
      simulatedCounter = '对方追问：那明早一上班真能直接拿去用吗？';
      finalReply = '放心！明早9点一睁眼就满血输出，绝不敷衍也绝不替突发状况背锅，咱们各自按分工进度稳稳对齐！';
    } else if (hasCommute || hasDirections) {
      if (hasDirections && hasCommute) {
        firstReply = '真不巧我正赶着去车站，手头物件带着马上得走，不过出大厅左转就有直达乘车口和充电点。';
        simulatedCounter = '对方反扑：车还有十五分钟才来吧，耽误不了两分钟！';
        finalReply = '闸口检票马上截止，实在不敢耽搁；我把具体走法和附近租借点标在位置发你，按图走最省时间！';
      } else if (hasCommute) {
        firstReply = '我现在正急着赶末班车，路上信号也不稳，这一波实在匀不出完整精力来接。';
        simulatedCounter = '对方反扑：你在车上顺手弄一下不就行了？';
        finalReply = '车厢里操作容易出错反倒误事，我下车安顿好或明早一早就给你准信，先不拍胸脯耽误节奏。';
      } else {
        firstReply = '这块我虽不能直接替你扛下来，但我可以把具体路径和对应接口指给你，走起来能省一半事。';
        simulatedCounter = '对方反扑：要不你直接帮我跑一趟算了？';
        finalReply = '路线和关键节点我已经发你了，按这个顺序去对接最快，剩下的交由本人核对才稳妥。';
      }
    } else if (preferAccept) {
      firstReply = '我先帮你把最核心的一小块框架兜住，不过全部量今晚确实吃不下，得拆成两段来交。';
      simulatedCounter = '对方反扑：既然接了就一起全收尾了吧？';
      finalReply = '先保今晚必须上交的主体稳过，剩下补充项明确排到明早9点半接力，这样双方都不至于卡死。';
    } else if (hasPowerbank) {
      firstReply = '实在不好意思，我等会儿还得靠手机联系要紧事，电量刚够撑回家，这块确实没法外借。';
      simulatedCounter = '对方反扑：就借一格电应急嘛，很近的！';
      finalReply = '真不是小气，我自己电量也在报警线；隔壁便利店门口就有共享柜机，走过去十秒就能扫出来用。';
    } else if (hasBlame || compiled.style === 'crisp') {
      firstReply = r1.reply + '（按各自负责范围留痕确认，不额外兜底。）';
      simulatedCounter = r1.opponentCounter;
      finalReply = r2.finalReply + ' 边界和归属先在记录里标明，后续核对才不会互相扯皮。';
    } else if (compiled.style === 'diplomatic') {
      firstReply = '特别理解这边挺着急的，' + r1.reply;
      simulatedCounter = r1.opponentCounter;
      finalReply = '谢谢理解哈，' + r2.finalReply;
    } else {
      firstReply = r1.reply;
      simulatedCounter = r1.opponentCounter;
      finalReply = r2.finalReply;
    }

    if (hasBlame && finalReply.indexOf('归属') === -1 && finalReply.indexOf('职责') === -1) {
      finalReply += ' 各自职责边界我们先写清楚，避免后续混淆。';
    }

    var v1 = validateAgainstConstraints(firstReply, compiled);
    var v2 = validateAgainstConstraints(finalReply, compiled);
    if (!v1.valid) {
      firstReply = stripHardBansFallback(firstReply, compiled);
      v1 = validateAgainstConstraints(firstReply, compiled);
    }
    if (!v2.valid) {
      finalReply = stripHardBansFallback(finalReply, compiled);
      v2 = validateAgainstConstraints(finalReply, compiled);
    }

    return {
      status: (v1.valid && v2.valid) ? 'OK' : 'FALLBACK_SAFE',
      compiled: compiled,
      baselineTemplateReply: baselineTemplateReply,
      firstReply: firstReply,
      simulatedCounter: simulatedCounter,
      finalReply: finalReply,
      unappliedRules: (v1.valid && v2.valid) ? [] : ['触发硬禁词二次兜底替换'],
      validation: {
        valid: v1.valid && v2.valid,
        violatedBans: v1.violatedBans.concat(v2.violatedBans)
      },
      aiNotice: '内容由 AI 生成（Demo 规则编译器演示）'
    };
  }

  function encodeHandoff(opts) {
    var o = opts || {};
    var sc = getScenario(o.scenarioId);
    var r1 = findR1Choice(sc, o.r1ChoiceId) || sc.round1Choices[0];
    var r2 = findR2Choice(r1, o.r2ChoiceId) || r1.round2Choices[0];
    var token = Math.random().toString(36).slice(2, 8);
    return '?s=' + encodeURIComponent(sc.id) +
      '&r1=' + encodeURIComponent(r1.id) +
      '&r2=' + encodeURIComponent(r2.id) +
      '&t=' + encodeURIComponent(token);
  }

  function decodeHandoff(searchStr) {
    var fallback = {
      restored: false,
      scenarioId: 'boss_weekend',
      peerR1: null,
      peerR2: null,
      token: null,
      peerSummary: null
    };
    if (!searchStr || typeof searchStr !== 'string') {
      return fallback;
    }
    var raw = searchStr.charAt(0) === '?' ? searchStr.slice(1) : searchStr;
    if (!raw) return fallback;

    var params = new URLSearchParams(raw);
    var s = resolveScenarioId(params.get('s'));
    var rawS = params.get('s');
    if (!rawS || (!Object.prototype.hasOwnProperty.call(L1_SCENARIOS, rawS) && rawS !== 'overtime_last_min')) {
      return fallback;
    }
    var r1Id = params.get('r1');
    var r2Id = params.get('r2');
    var t = params.get('t');

    if (!t || !/^[a-z0-9]{4,16}$/i.test(t)) {
      return fallback;
    }
    var sc = L1_SCENARIOS[s];
    var r1 = findR1Choice(sc, r1Id);
    var r2 = findR2Choice(r1, r2Id);
    if (!r1 || !r2) {
      return fallback;
    }
    return {
      restored: true,
      scenarioId: sc.id,
      peerR1: { id: r1.id, label: r1.label, stanceTag: r1.stanceTag },
      peerR2: { id: r2.id, label: r2.label, stanceLabel: r2.stanceLabel, badge: r2.badge },
      token: t,
      peerSummary: '好友选择了「' + r1.label + ' → ' + r2.label + '」（' + r2.badge + '）'
    };
  }

  function createTelemetry() {
    return {
      counts: {
        feed_impression: 1,
        card_open: 0,
        entry_cta_tap: 0,
        r1_tap: 0,
        r2_complete: 0,
        copy_reply: 0,
        comment_open: 0,
        dm_preview_open: 0,
        l2_enter: 0,
        l2_compile: 0,
        voluntary_share: 0
      },
      recentEnvelopes: []
    };
  }

  function recordEvent(telemetry, eventName, meta) {
    var base = telemetry && telemetry.counts ? telemetry : createTelemetry();
    var nextCounts = {};
    var keys = Object.keys(base.counts);
    for (var i = 0; i < keys.length; i++) {
      nextCounts[keys[i]] = base.counts[keys[i]];
    }
    if (Object.prototype.hasOwnProperty.call(nextCounts, eventName)) {
      nextCounts[eventName] += 1;
    }
    var env = createEnvelope({
      scenarioId: (meta && meta.scenarioId) || 'boss_weekend',
      sessionId: (meta && meta.sessionId) || '',
      revision: (meta && meta.revision) || 1,
      kind: 'event:' + eventName,
      payload: (meta && meta.payload) || {}
    });
    var nextLogs = [env].concat(base.recentEnvelopes || []).slice(0, 10);
    return {
      counts: nextCounts,
      recentEnvelopes: nextLogs
    };
  }

  function getArchiveByteLength(doc) {
    var json = JSON.stringify(doc);
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(json).length;
    }
    return unescape(encodeURIComponent(json)).length;
  }

  function createEmptyArchive() {
    return {
      v: SCHEMA_VERSION,
      rev: 0,
      recentCases: []
    };
  }

  function appendArchiveCase(doc, entry) {
    var base = (doc && Array.isArray(doc.recentCases)) ? doc : createEmptyArchive();
    var e = entry || {};
    var compact = {
      id: String(e.id || generateId('c')).slice(0, 20),
      s: String(e.scenarioId || 'boss_weekend').slice(0, 24),
      r: String(e.r1Label || '').slice(0, 10) + '>' + String(e.r2Label || '').slice(0, 10),
      b: String(e.badge || '').slice(0, 10),
      t: Number(e.ts) || Math.floor(Date.now() / 1000)
    };
    var nextList = [compact].concat(base.recentCases).slice(0, ARCHIVE_MAX_ITEMS);
    var nextDoc = {
      v: SCHEMA_VERSION,
      rev: (Number(base.rev) || 0) + 1,
      recentCases: nextList
    };
    while (nextDoc.recentCases.length > 0 && getArchiveByteLength(nextDoc) >= ARCHIVE_MAX_BYTES) {
      nextDoc.recentCases.pop();
    }
    return nextDoc;
  }

  function serializeArchive(doc) {
    return JSON.stringify(doc);
  }

  function parseArchive(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') {
      return createEmptyArchive();
    }
    try {
      var parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.recentCases)) {
        return {
          v: SCHEMA_VERSION,
          rev: Number(parsed.rev) || 0,
          recentCases: parsed.recentCases.slice(0, ARCHIVE_MAX_ITEMS)
        };
      }
    } catch (_err) {
      return createEmptyArchive();
    }
    return createEmptyArchive();
  }

  function clearArchive() {
    return createEmptyArchive();
  }

  return {
    SCHEMA_VERSION: SCHEMA_VERSION,
    ARCHIVE_MAX_BYTES: ARCHIVE_MAX_BYTES,
    ARCHIVE_MAX_ITEMS: ARCHIVE_MAX_ITEMS,
    L1_SCENARIOS: L1_SCENARIOS,
    PROMO_SCRIPTS: PROMO_SCRIPTS,
    MOCK_COMMENTS: MOCK_COMMENTS,
    FUNNEL_DIAGNOSIS: FUNNEL_DIAGNOSIS,
    createEnvelope: createEnvelope,
    getScenario: getScenario,
    createSession: createSession,
    enterCard: enterCard,
    selectRound1: selectRound1,
    selectRound2: selectRound2,
    resetSession: resetSession,
    switchScenario: switchScenario,
    shouldAcceptResponse: shouldAcceptResponse,
    checkSafety: checkSafety,
    compileConstraintText: compileConstraintText,
    validateAgainstConstraints: validateAgainstConstraints,
    runL2ConstraintSandbox: runL2ConstraintSandbox,
    encodeHandoff: encodeHandoff,
    decodeHandoff: decodeHandoff,
    createTelemetry: createTelemetry,
    recordEvent: recordEvent,
    getArchiveByteLength: getArchiveByteLength,
    createEmptyArchive: createEmptyArchive,
    appendArchiveCase: appendArchiveCase,
    serializeArchive: serializeArchive,
    parseArchive: parseArchive,
    clearArchive: clearArchive
  };
});
