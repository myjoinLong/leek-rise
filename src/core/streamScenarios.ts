import { seededShuffle } from './scenarioDeck';
import { streamContinuationFor } from './streamScenarioVariants';

export interface StreamBeat {
  title: string;
  briefing: string;
}

export interface StreamScenario {
  id: string;
  title: string;
  product: string;
  audience: string;
  xiaolianLine: string;
  beats: readonly [StreamBeat, StreamBeat, StreamBeat];
  topicHeat: 0 | 1 | 2;
  claimRisk: 0 | 1 | 2;
  proofDemand: 0 | 1 | 2;
  urgency: 0 | 1 | 2;
  dealFit: -1 | 0 | 1;
}

export const streamScenarios: readonly StreamScenario[] = [
  { id: 'battery-brick', title: '直播间里的鼓包电池', product: '二手手机电池', audience: '想给旧手机续命的通勤客', xiaolianLine: '“店家说还能撑一天，可我昨晚亲眼看见后盖翘起来了。”', beats: [{ title: '先看机器', briefing: '镜头里后盖有一道缝。评论区问：这是正常老化，还是该立刻停用？' }, { title: '观众追问', briefing: '有人拿出同型号照片，指出电池鼓包可能带来安全风险。' }, { title: '下播前', briefing: '商家催你挂链接，检测报告还没有发到手。' }], topicHeat: 1, claimRisk: 2, proofDemand: 2, urgency: 1, dealFit: -1 },
  { id: 'desk-lamp', title: '宿舍护眼灯测评', product: '台灯', audience: '准备开学的学生和家长', xiaolianLine: '“我以前也信过‘护眼’两个字，后来才知道得看参数。”', beats: [{ title: '拆箱实测', briefing: '包装写着护眼，页面却没有频闪和照度数据。' }, { title: '弹幕提问', briefing: '家长想知道桌面不同位置的亮度，学生只关心够不够便宜。' }, { title: '优惠说明', briefing: '今晚确有满减，但库存并没有倒计时限制。' }], topicHeat: 0, claimRisk: 1, proofDemand: 2, urgency: 0, dealFit: 1 },
  { id: 'raincoat-seam', title: '暴雨天的儿童雨披', product: '儿童雨披', audience: '接送孩子的家长', xiaolianLine: '“我小时候淋雨回家，最烦大人说‘这点雨没事’。”', beats: [{ title: '天气突变', briefing: '窗外开始下雨，样品袖口的压胶看起来有一点翘边。' }, { title: '家长连麦', briefing: '一位家长问雨披能否覆盖书包，另一位追问是否有异味。' }, { title: '最后一轮', briefing: '商家只确认了防泼水，没有提供长时间浸水测试。' }], topicHeat: 2, claimRisk: 1, proofDemand: 1, urgency: 2, dealFit: 1 },
  { id: 'meal-box', title: '带饭族的保温饭盒', product: '保温饭盒', audience: '轮班工人和上班族', xiaolianLine: '“我不想把饭盒说成能保温一整天，实测没到那个时间。”', beats: [{ title: '午休开播', briefing: '商品页写着长效保温，手边的温度计刚测完两小时样品。' }, { title: '拿数据说话', briefing: '观众问容量和清洗死角，样品盖缝里还留着一粒米。' }, { title: '订单催促', briefing: '运营说今天的折扣是真的，但保温时长没有第三方检测。' }], topicHeat: 0, claimRisk: 1, proofDemand: 2, urgency: 1, dealFit: 0 },
  { id: 'budget-headphones', title: '百元耳机的降噪争议', product: '无线耳机', audience: '预算有限的学生', xiaolianLine: '“我上学那会儿买过最便宜的耳机，戴久了耳朵疼。”', beats: [{ title: '嘈杂环境测试', briefing: '街边环境声很大，耳机能压低一些噪音，但不是主动降噪。' }, { title: '弹幕对比', briefing: '观众把它和贵一倍的型号比较，追问延迟和佩戴感。' }, { title: '限时券', briefing: '平台优惠券今晚到期，库存充足，不能说成售罄倒计时。' }], topicHeat: 1, claimRisk: 1, proofDemand: 1, urgency: 1, dealFit: 1 },
  { id: 'neck-fan', title: '小风扇能不能撑过通勤', product: '挂脖风扇', audience: '户外工作者和排队乘客', xiaolianLine: '“风大不等于凉快，脖子上的重量也得算进去。”', beats: [{ title: '站台实测', briefing: '风扇开到二档，镜头收进噪音和续航计时器。' }, { title: '高温追问', briefing: '观众担心电池发热，品牌方只提供了常温续航数据。' }, { title: '收尾报价', briefing: '降价幅度清楚，但高温环境表现尚未验证。' }], topicHeat: 2, claimRisk: 1, proofDemand: 2, urgency: 0, dealFit: 0 },
  { id: 'shoe-insole', title: '久站鞋垫的体感测试', product: '缓震鞋垫', audience: '服务业和仓库员工', xiaolianLine: '“站八小时的人不需要玄学词，脚底疼不疼自己知道。”', beats: [{ title: '站立挑战', briefing: '她穿着鞋垫站了半小时，镜头前没有把体验说成医疗效果。' }, { title: '真实反馈', briefing: '观众问不同鞋型能不能用，尺码表只覆盖了常见范围。' }, { title: '报价前核对', briefing: '店铺支持七天退换，拆封后的规则要先讲清楚。' }], topicHeat: 0, claimRisk: 0, proofDemand: 2, urgency: 0, dealFit: 1 },
  { id: 'cleaner', title: '清洁剂去污前后对照', product: '厨房清洁剂', audience: '租房住户和小餐馆店主', xiaolianLine: '“镜头剪掉十分钟不代表污渍就自己消失了。”', beats: [{ title: '污渍对照', briefing: '两块油污分别处理，时间、用量和擦拭次数都在画面里。' }, { title: '安全问题', briefing: '弹幕问能否和漂白剂混用，标签明确写着不能混合。' }, { title: '优惠收口', briefing: '产品有清洁效果记录，但不适用于所有材质。' }], topicHeat: 1, claimRisk: 0, proofDemand: 2, urgency: 1, dealFit: 0 },
  { id: 'budget-ricecooker', title: '出租屋迷你电饭锅', product: '迷你电饭锅', audience: '刚搬家的年轻租客', xiaolianLine: '“房子小不是缺点，插座和清洗空间也要先看。”', beats: [{ title: '一人份试煮', briefing: '按说明加水煮一杯米，镜头拍下锅底和跳闸后的状态。' }, { title: '评论区算账', briefing: '观众比较耗电、容量与清洗难度，商家只给了额定功率。' }, { title: '活动说明', briefing: '优惠后价格明确，赠品数量有限但主商品库存正常。' }], topicHeat: 0, claimRisk: 0, proofDemand: 1, urgency: 1, dealFit: 1 },
  { id: 'rain-boots', title: '雨靴防滑不是一句话', product: '短筒雨靴', audience: '雨天骑行者和清洁工', xiaolianLine: '“鞋底纹路看着深，不代表湿瓷砖上就不会滑。”', beats: [{ title: '湿地测试', briefing: '她用浅水地面慢步演示，不做危险的冲刺动作。' }, { title: '尺码问题', briefing: '两位观众反馈鞋头偏窄，页面的脚长对照表不完整。' }, { title: '库存压力', briefing: '仓库确实只剩少量大码，其他尺码没有限量。' }], topicHeat: 1, claimRisk: 1, proofDemand: 2, urgency: 1, dealFit: 0 },
  { id: 'phone-stand', title: '直播支架的承重测试', product: '手机支架', audience: '小商户和居家主播', xiaolianLine: '“我摔过一次手机，所以今天先测夹口，别急着拍好看。”', beats: [{ title: '桌边开测', briefing: '支架夹在薄桌板上，手机横竖屏都要测试稳不稳。' }, { title: '角度追问', briefing: '观众问能不能夹床头，说明书只写了桌面厚度范围。' }, { title: '产品收尾', briefing: '优惠真实，重型平板不在承重测试范围内。' }], topicHeat: 0, claimRisk: 0, proofDemand: 1, urgency: 0, dealFit: 1 },
  { id: 'sleep-mask', title: '遮光眼罩与夜班作息', product: '遮光眼罩', audience: '夜班工人和备考学生', xiaolianLine: '“我爸上夜班时白天睡不着，才发现安静和遮光都重要。”', beats: [{ title: '午间试戴', briefing: '窗边自然光下检查鼻梁漏光和松紧带压痕。' }, { title: '敏感肌提问', briefing: '评论区询问面料成分，吊牌只标出外层材质。' }, { title: '最后答疑', briefing: '商品不承诺治疗失眠，清洗方式按标签说明。' }], topicHeat: 0, claimRisk: 0, proofDemand: 2, urgency: 0, dealFit: 0 },
  { id: 'powerbank', title: '充电宝容量标注核验', product: '移动电源', audience: '经常出差的乘客', xiaolianLine: '“包装上的数字不等于手机能充进去的电量，这点我以前也搞混。”', beats: [{ title: '标签细看', briefing: '额定容量和电芯容量写在不同位置，镜头逐项指出。' }, { title: '航旅追问', briefing: '观众问能否带上飞机，页面没有清晰展示额定能量。' }, { title: '上链接前', briefing: '商家提供了检测截图，但需要提醒乘客核对航空规定。' }], topicHeat: 1, claimRisk: 2, proofDemand: 2, urgency: 0, dealFit: -1 },
  { id: 'cheap-mattress', title: '折叠床垫的回弹演示', product: '折叠床垫', audience: '合租人群和临时照护者', xiaolianLine: '“睡一晚的感觉我能讲，治腰疼这种话我不能替医生讲。”', beats: [{ title: '展开测量', briefing: '展开后测厚度和折痕，包装标称与实物数据基本吻合。' }, { title: '弹幕分享', briefing: '观众问长期使用会不会塌，直播时长不足以验证耐久。' }, { title: '优惠说明', briefing: '赠枕活动有明确截止时间，但不代表商品只剩最后几件。' }], topicHeat: 0, claimRisk: 0, proofDemand: 1, urgency: 1, dealFit: 1 },
  { id: 'water-filter', title: '净水壶滤芯使用提醒', product: '滤水壶', audience: '关注用水成本的租户', xiaolianLine: '“滤芯不是装上就永久有效，耗材的钱也要一起算。”', beats: [{ title: '首次使用', briefing: '按说明完成冲洗，镜头记录滤芯和壶体的安装过程。' }, { title: '成本追问', briefing: '观众关心滤芯更换频率，商品页只给出建议周期。' }, { title: '促销边界', briefing: '首壶优惠明显，后续滤芯并没有同等折扣。' }], topicHeat: 0, claimRisk: 1, proofDemand: 2, urgency: 0, dealFit: -1 },
  { id: 'work-gloves', title: '搬货手套耐磨挑战', product: '防滑手套', audience: '仓库分拣员和装修工', xiaolianLine: '“手套破了是小钱，手被划伤不是。”', beats: [{ title: '抓握测试', briefing: '戴手套搬纸箱，测试干燥表面抓握，不冒充防割等级。' }, { title: '工友提问', briefing: '观众想知道掌心涂层耐不耐油，样品没有做油污测试。' }, { title: '结尾选择', briefing: '有多种尺码，但小码库存不多，不能说全尺码紧缺。' }], topicHeat: 1, claimRisk: 1, proofDemand: 1, urgency: 1, dealFit: 0 },
  { id: 'portable-stove', title: '户外炉具安全边界', product: '便携炉具', audience: '露营新手', xiaolianLine: '“我喜欢露营，但安全说明比氛围灯重要得多。”', beats: [{ title: '说明书先行', briefing: '直播先展示通风和气罐型号要求，不在密闭室内点火。' }, { title: '新手提问', briefing: '评论区问能否在帐篷里使用，说明书明确禁止。' }, { title: '品牌催单', briefing: '有优惠券，但燃料兼容型号仍要让玩家看清。' }], topicHeat: 2, claimRisk: 2, proofDemand: 2, urgency: 1, dealFit: -1 },
  { id: 'school-backpack', title: '开学书包肩带检查', product: '双肩书包', audience: '小学生家长', xiaolianLine: '“我小时候总把书包塞满，肩带断过一次，记到现在。”', beats: [{ title: '缝线检查', briefing: '镜头检查肩带缝线、拉链和空包重量。' }, { title: '家长留言', briefing: '观众问能装几本书，商品页没有给出承重上限。' }, { title: '活动倒计时', briefing: '开学券今晚结束，赠品数量已在页面标明。' }], topicHeat: 2, claimRisk: 1, proofDemand: 1, urgency: 2, dealFit: 1 },
  { id: 'coffee-cup', title: '随行杯漏水复测', product: '随行杯', audience: '骑手和公交通勤族', xiaolianLine: '“包里漏过一次咖啡，我宁愿现在多摇几下。”', beats: [{ title: '倒置检查', briefing: '杯盖装好后倒置摇晃，第一轮没有渗漏。' }, { title: '清洗缝隙', briefing: '弹幕指出密封圈能拆，但说明书没有提到多久更换。' }, { title: '最后报价', briefing: '保温时长来自厂商数据，直播没有做整夜测试。' }], topicHeat: 1, claimRisk: 1, proofDemand: 2, urgency: 0, dealFit: 1 },
  { id: 'cheap-printer', title: '家用打印机耗材账', product: '家用打印机', audience: '学生家长和自由职业者', xiaolianLine: '“机器便宜只是第一笔，墨盒换几次才是长期花销。”', beats: [{ title: '打印样张', briefing: '黑白文本打印清晰，彩色照片还没有现场验证。' }, { title: '耗材提问', briefing: '观众把墨盒价格发到弹幕，单页成本比机身更受关注。' }, { title: '促销收口', briefing: '主机优惠真实，赠墨量与后续耗材价格分开说明。' }], topicHeat: 0, claimRisk: 1, proofDemand: 2, urgency: 0, dealFit: -1 },
  { id: 'bike-lock', title: '自行车锁剪切测试', product: '链条锁', audience: '骑车通勤的上班族', xiaolianLine: '“我丢过一辆旧车，知道锁能拖时间，但不是防盗保证。”', beats: [{ title: '结构展示', briefing: '展示锁芯和链节，不用夸张道具假装完成专业破坏测试。' }, { title: '安全追问', briefing: '观众问能否防住液压剪，直播没有相应工具和测试条件。' }, { title: '使用提醒', briefing: '锁具长度适合固定车架，安全等级需要以检测标注为准。' }], topicHeat: 1, claimRisk: 2, proofDemand: 2, urgency: 0, dealFit: 0 },
  { id: 'desk-fan', title: '老旧风扇清洁与降噪', product: '桌面风扇', audience: '宿舍住户和夜间值班员', xiaolianLine: '“机器吵不吵要让大家听原声，别用音乐盖掉。”', beats: [{ title: '原声开机', briefing: '手机收音距离固定，展示低档和高档的实际声音。' }, { title: '清洁问题', briefing: '扇罩可以拆洗，但需要断电后操作，观众提醒别伸手试转。' }, { title: '优惠核对', briefing: '店铺券确实能用，噪音表现会受测量环境影响。' }], topicHeat: 0, claimRisk: 0, proofDemand: 1, urgency: 1, dealFit: 1 },
  { id: 'first-aid-kit', title: '家用急救包查缺补漏', product: '家庭急救包', audience: '租房家庭和小店经营者', xiaolianLine: '“包里有东西不等于会急救，说明书不能替代培训。”', beats: [{ title: '逐项清点', briefing: '检查纱布、胶带和有效期，不把急救包宣传成治疗方案。' }, { title: '观众提问', briefing: '弹幕问药品是否包含，当前套装只含基础耗材。' }, { title: '库存说明', briefing: '促销套装数量有限，但单件基础款仍可购买。' }], topicHeat: 1, claimRisk: 1, proofDemand: 2, urgency: 1, dealFit: 0 },
  { id: 'repaired-phone', title: '翻新机的维修记录', product: '翻新手机', audience: '预算有限的换机用户', xiaolianLine: '“便宜有原因，维修记录和电池状态都要说在前面。”', beats: [{ title: '机况展示', briefing: '机身有更换屏幕记录，镜头边框还能看见轻微磕痕。' }, { title: '买家核验', briefing: '观众要看电池健康度，检测页面显示电池并非原装。' }, { title: '付款提醒', briefing: '售后期和退换边界在页面里，不能只喊低价不讲条件。' }], topicHeat: 2, claimRisk: 2, proofDemand: 2, urgency: 1, dealFit: -1 },
  { id: 'laundry-dryer', title: '小户型烘衣架实测', product: '折叠烘衣架', audience: '合租住户和南方家庭', xiaolianLine: '“梅雨天衣服干得慢，我懂；电费也得算进去。”', beats: [{ title: '挂衣试用', briefing: '挂上两件湿衣展示承重，机器标称功率与插头标签一致。' }, { title: '耗电讨论', briefing: '观众问一晚多少钱，直播没有电表连续测量数据。' }, { title: '结束前核价', briefing: '活动价已确认，安全距离和通风要求不能省略。' }], topicHeat: 1, claimRisk: 1, proofDemand: 1, urgency: 1, dealFit: 1 },
  { id: 'cheap-camera', title: '入门摄像头的隐私设置', product: '家用摄像头', audience: '独居租户和小店店主', xiaolianLine: '“安全感不能靠多装一个镜头，隐私设置要先弄明白。”', beats: [{ title: '安装前检查', briefing: '展示默认权限和账号绑定步骤，先说明镜头会拍到哪里。' }, { title: '弹幕担忧', briefing: '观众问云存储费用，商品详情里免费期和续费价分开列出。' }, { title: '销售收尾', briefing: '设备能看实时画面，但不能保证网络和账号绝不出问题。' }], topicHeat: 1, claimRisk: 2, proofDemand: 2, urgency: 0, dealFit: -1 },
  { id: 'old-coat', title: '旧衣护理机去球效果', product: '衣物护理器', audience: '二手衣买家和节俭家庭', xiaolianLine: '“一件衣服穿久了有毛球，不等于它就该被扔掉。”', beats: [{ title: '旧衣开测', briefing: '同一块袖口分区处理，镜头展示前后差异。' }, { title: '材质追问', briefing: '观众问羊毛衫能不能用，说明书建议先在不显眼处测试。' }, { title: '优惠说明', briefing: '优惠码没有隐藏门槛，替换刀头需要另行购买。' }], topicHeat: 0, claimRisk: 0, proofDemand: 1, urgency: 0, dealFit: 1 },
  { id: 'water-bottle', title: '运动水壶材质标签', product: '运动水壶', audience: '夜跑者和健身新手', xiaolianLine: '“我最近才开始夜跑，买装备之前先学会看标识。”', beats: [{ title: '标签近拍', briefing: '瓶底材质标识清晰，热水适用范围需要按说明书确认。' }, { title: '异味反馈', briefing: '有观众说新壶需要清洗几次，品牌没有提供气味测试报告。' }, { title: '最后一问', briefing: '套装有吸嘴和直饮盖，替换件价格单独展示。' }], topicHeat: 1, claimRisk: 1, proofDemand: 2, urgency: 0, dealFit: 0 },
  { id: 'repair-kit', title: '租房工具包的螺丝规格', product: '家用工具包', audience: '刚独立生活的年轻人', xiaolianLine: '“我第一次自己装桌子，少一把合适的螺丝刀就卡了半天。”', beats: [{ title: '开箱点数', briefing: '按清单核对工具数量，绝缘等级没有标注的螺丝刀不用于带电作业。' }, { title: '新手提问', briefing: '观众问能否修插座，工具包不代表具备电工资质。' }, { title: '价格收尾', briefing: '单件补充工具有明码标价，整套折扣需满足页面条件。' }], topicHeat: 0, claimRisk: 1, proofDemand: 1, urgency: 1, dealFit: 0 },
  { id: 'air-purifier', title: '空气净化器滤网费用', product: '桌面净化器', audience: '租房白领和养宠家庭', xiaolianLine: '“空气问题我不敢凭鼻子下结论，先看滤网和适用面积。”', beats: [{ title: '规格核对', briefing: '标称适用面积是小房间，直播间不能代表真实家庭环境。' }, { title: '养宠观众', briefing: '弹幕问毛发过滤和耗材周期，商品页没有公布长期使用成本。' }, { title: '下播提醒', briefing: '机器有折扣，但不要把它说成能治疗过敏。' }], topicHeat: 2, claimRisk: 2, proofDemand: 2, urgency: 0, dealFit: -1 },
  { id: 'market-scale', title: '厨房秤误差复核', product: '电子厨房秤', audience: '做饭新手和摆摊小贩', xiaolianLine: '“做饭少放一点还能补，摆摊称错了就是别人的损失。”', beats: [{ title: '砝码校验', briefing: '用已知重量逐档测量，桌面不平会让读数跳动。' }, { title: '精度追问', briefing: '观众要看最小刻度，商家只提供了家用量程说明。' }, { title: '商品介绍', briefing: '价格便宜但不适合商业计量，使用场景要说清楚。' }], topicHeat: 0, claimRisk: 1, proofDemand: 2, urgency: 0, dealFit: 0 },
  { id: 'camera-light', title: '主播补光灯发热测试', product: '环形补光灯', audience: '小商家和兼职主播', xiaolianLine: '“以前我觉得灯越亮越好，开一小时后才发现热也是真的。”', beats: [{ title: '色温试拍', briefing: '固定手机曝光后对比三档色温，不用滤镜掩盖肤色偏差。' }, { title: '长播顾虑', briefing: '观众问连续开播会不会烫，今天只完成了短时温升记录。' }, { title: '收尾交易', briefing: '支架承重有上限，重型相机不在配件适用范围。' }], topicHeat: 1, claimRisk: 1, proofDemand: 1, urgency: 1, dealFit: 1 },
  { id: 'budget-printer-paper', title: '打印纸克重与卡纸', product: '家用打印纸', audience: '备考学生和社区小店', xiaolianLine: '“便宜纸我用过，卡一次纸就得多花一晚上整理。”', beats: [{ title: '连续进纸', briefing: '连打二十张观察卡纸，打印机和纸张型号都在画面标明。' }, { title: '成本讨论', briefing: '评论区比较克重、张数和单包价格，快递破损率没有数据。' }, { title: '结束报价', briefing: '组合装有满件优惠，单包购买不享受同一折扣。' }], topicHeat: 0, claimRisk: 0, proofDemand: 1, urgency: 1, dealFit: 0 },
  { id: 'heated-seat', title: '冬季电热坐垫功率', product: '电热坐垫', audience: '夜班司机和老人家属', xiaolianLine: '“暖和是暖和，线路和断电保护比直播间气氛更重要。”', beats: [{ title: '铭牌展示', briefing: '镜头对准额定功率和断电保护说明，不在无人看管时长时间通电。' }, { title: '安全提问', briefing: '观众问能否整夜使用，说明书建议离开时关闭电源。' }, { title: '最后说明', briefing: '优惠价可查，温度档位并不代表医疗理疗功能。' }], topicHeat: 1, claimRisk: 2, proofDemand: 2, urgency: 0, dealFit: 0 },
  { id: 'budget-suitcase', title: '廉价行李箱拉杆复测', product: '登机箱', audience: '刚工作的差旅新人', xiaolianLine: '“我第一次出差拖坏过拉杆，赶车时真没空研究保修条款。”', beats: [{ title: '滚轮检查', briefing: '地砖上往返推行，拉杆不同高度都检查锁止。' }, { title: '售后追问', briefing: '观众关心轮子坏了怎么修，保修范围不包括人为损伤。' }, { title: '优惠收尾', briefing: '箱体尺寸接近登机限制，仍需按航空公司规定确认。' }], topicHeat: 1, claimRisk: 1, proofDemand: 1, urgency: 2, dealFit: 1 },
  { id: 'street-food-apron', title: '夜摊围裙防油宣传', product: '防水围裙', audience: '夜市摊主和餐饮新人', xiaolianLine: '“摊上油点子多，我妈以前一条围裙能补三回。”', beats: [{ title: '油渍演示', briefing: '少量水和食用油分别测试，不能把防水说成防所有化学品。' }, { title: '摊主连麦', briefing: '观众问口袋承重，样品缝线没有做重物拉扯测试。' }, { title: '压轴优惠', briefing: '组合装折扣明确，单件购买并没有倒计时限制。' }], topicHeat: 2, claimRisk: 1, proofDemand: 1, urgency: 1, dealFit: 1 },
  { id: 'winter-gloves', title: '骑行手套保暖与触屏', product: '骑行手套', audience: '冬季通勤骑手', xiaolianLine: '“手冻僵时刹车都不灵活，别为了触屏把保暖说满。”', beats: [{ title: '路边试戴', briefing: '对比指尖触屏和握把手感，不进行上路高速演示。' }, { title: '骑手建议', briefing: '观众反馈掌心防滑不错，但极寒温度没有经过测试。' }, { title: '下播前', briefing: '尺码表可以查，防水性能只有日常泼水测试。' }], topicHeat: 1, claimRisk: 1, proofDemand: 1, urgency: 0, dealFit: 0 },
];

const scenarioSalt = 0x51EA6;
const legacyScenario: StreamScenario = {
  id: 'legacy', title: '日常好物分享', product: '日常商品', audience: '直播间观众', xiaolianLine: '镜头前讲的是财富自由，镜头后还得把每项数据说清楚。',
  beats: [
    { title: '开场选题', briefing: '镜头亮起，第一句话决定观众留下还是划走。' },
    { title: '弹幕升温', briefing: '有人追问价格和效果，运营催你赶紧把订单数据拉起来。' },
    { title: '最后冲刺', briefing: '下播倒计时开始，你决定如何介绍最后一轮优惠。' },
  ],
  topicHeat: 0, claimRisk: 0, proofDemand: 0, urgency: 0, dealFit: 0,
};

export function streamScenarioFor(day: number, scenarioVersion = 1, seed = 4): StreamScenario {
  if (scenarioVersion !== 2 && scenarioVersion !== 3) return legacyScenario;
  const safeDay = Math.max(1, Math.floor(day));
  const deck = seededShuffle(streamScenarios, seed, scenarioSalt);
  if (scenarioVersion === 3 && safeDay > deck.length) {
    return streamContinuationFor(safeDay - deck.length - 1, seed, streamScenarios);
  }
  return deck[(safeDay - 1) % deck.length]!;
}
