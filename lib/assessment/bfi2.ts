import { defaultScoring, generalLimit, type Scale } from "./types";
// Zhang et al. (2022), Appendix, pp. 18–19 of author-hosted PDF.
// BFI-2 © Soto & John. Non-commercial research only; not public domain.
const wording = [
  "性格外向，喜欢交际", "心肠柔软，有同情心", "缺乏条理", "从容，善于处理压力", "对艺术没有什么兴趣",
  "性格坚定自信，敢于表达自己的观点", "为人恭谦，尊重他人", "比较懒", "经历挫折后仍能保持积极心态", "对许多不同的事物都感兴趣",
  "很少觉得兴奋或者特别想要(做)什么", "常常挑别人的毛病", "可信赖的，可靠的", "喜怒无常，情绪起伏较多", "善于创造，能找到聪明的方法来做事",
  "比较安静", "对他人没有什么同情心", "做事有计划有条理", "容易紧张", "着迷于艺术、音乐或文学",
  "常常处于主导地位，像个领导一样", "常与他人意见不和", "很难开始行动起来去完成一项任务", "觉得有安全感，对自己满意", "不喜欢知识性或者哲学性强的讨论",
  "不如别人有活力", "宽宏大量", "有时比较没有责任心", "情绪稳定，不易生气", "几乎没有什么创造性",
  "有时会害羞，比较内向", "乐于助人，待人无私", "习惯让事物保持整洁有序", "时常忧心忡忡，担心很多事情", "重视艺术与审美",
  "感觉自己很难对他人产生影响", "有时对人比较粗鲁", "有效率，做事有始有终", "时常觉得悲伤", "思想深刻",
  "精力充沛", "不相信别人，怀疑别人的意图", "可靠的，总是值得他人信赖", "能够控制自己的情绪", "缺乏想象力",
  "爱说话，健谈", "有时对人冷淡，漠不关心", "乱糟糟的，不爱收拾", "很少觉得焦虑或者害怕", "觉得诗歌、戏剧很无聊",
  "更喜欢让别人来领头负责", "待人谦逊礼让", "有恒心，能坚持把事情做完", "时常觉得郁郁寡欢", "对抽象的概念和想法没什么兴趣",
  "充满热情", "把人往最好的方面想", "有时候会做出一些不负责任的行为", "情绪多变，容易愤怒", "有创意，能想出新点子",
];
const facets: [string, string, string, number[], string][] = [
  ["sociability", "社交", "extraversion", [1,16,31,46], "分数较高表示更认同主动交往、愿意与人交流的描述。"],
  ["assertiveness", "果断", "extraversion", [6,21,36,51], "描述表达立场和承担主导角色的倾向。"],
  ["energy", "活力", "extraversion", [11,26,41,56], "描述日常精力与热情。"],
  ["compassion", "同情", "agreeableness", [2,17,32,47], "描述对他人感受的关注与关怀。"],
  ["respectfulness", "谦恭", "agreeableness", [7,22,37,52], "描述尊重他人、保持礼让的倾向。"],
  ["trust", "信任", "agreeableness", [12,27,42,57], "描述对他人意图的基本信任。"],
  ["organization", "条理", "conscientiousness", [3,18,33,48], "描述计划、整理和维持秩序的倾向。"],
  ["productiveness", "效率", "conscientiousness", [8,23,38,53], "描述启动任务和坚持完成的倾向。"],
  ["responsibility", "负责", "conscientiousness", [13,28,43,58], "描述兑现承诺、可靠行事的倾向。"],
  ["anxiety", "焦虑倾向", "negative-emotionality", [4,19,34,49], "描述紧张和担心的自报倾向，不是焦虑症筛查。"],
  ["depression", "低落倾向", "negative-emotionality", [9,24,39,54], "对应原量表 Depression 子维度，仅描述低落体验，不是抑郁症诊断。"],
  ["volatility", "情绪易变", "negative-emotionality", [14,29,44,59], "描述情绪起伏和易怒的倾向。"],
  ["curiosity", "好奇", "open-mindedness", [10,25,40,55], "描述对知识和抽象想法的兴趣。"],
  ["aesthetic", "审美", "open-mindedness", [5,20,35,50], "描述对艺术、文学与美感的兴趣。"],
  ["imagination", "想象", "open-mindedness", [15,30,45,60], "描述创意与想象的倾向。"],
];
const reverse = new Set([3,4,5,8,9,11,12,16,17,22,23,24,25,26,28,29,30,31,36,37,42,44,45,47,48,49,50,51,55,58]);
export const bfi2: Scale = {
  id: "bfi2", version: "zh-2022-web-2026-09-12", versionDate: "2026-09-12", name: "大五人格问卷 BFI-2", category: "personality", language: "zh-CN",
  purpose: "从五个宽泛维度与十五个子维度，探索日常人格特征。", minutes: "10–15", exploratory: false,
  instructions: "请判断下面的特征是否符合通常的自己。每项接在「我是一个……的人」之后理解。", limitations: generalLimit + "使用张博、黎坚等研究中的中文版题目与评分键；本网站的呈现方式未单独验证，不能据此作个体诊断。子维度题目较少，解释需谨慎。",
  source: { id: "bfi2-zh", citation: "Soto & John (2017); Zhang, Li, Li, et al. (2022), Assessment, 29(6), 1262–1284. DOI: 10.1177/10731911211008245", url: "https://www.colby.edu/wp-content/uploads/2021/05/Zhang_et_al_in_press.pdf", permission: "© Soto & John；作者允许非商业研究使用：https://www.ocf.berkeley.edu/~johnlab/bfi.html；不得据此转为商业用途。", adaptation: "从作者托管论文附录录入中文版，题干未实质改写；移除纸面横线，空白规范化，屏幕显示一题。选项保留附录标签。" },
  options: ["非常不同意", "不太同意", "态度中立", "比较同意", "非常同意"].map((label,i) => ({value:i+1,label})), scoring: defaultScoring,
  dimensions: [
    {id:"extraversion",name:"外向性",description:"描述交往、表达与活力。分数较高表示在这些题目上更认同外向的行为描述；较低可能偏向安静和独处，没有优劣之分。"},
    {id:"agreeableness",name:"宜人性",description:"描述关怀、礼让与信任倾向，不是道德评价。"},
    {id:"conscientiousness",name:"尽责性",description:"描述条理、效率与责任倾向，不代表工作能力排名。"},
    {id:"negative-emotionality",name:"负性情绪",description:"分数较高表示更认同担心、低落或情绪起伏的描述；这不是临床症状判定。"},
    {id:"open-mindedness",name:"开放性",description:"描述求知、审美与想象兴趣，不代表智力高低。"},
    ...facets.map(([id,name,parentId,,description]) => ({id,name,parentId,description})),
  ],
  items: wording.map((text,i) => ({ id:`BFI${i+1}`,text,dimensionId:facets.find(f=>f[3].includes(i+1))![0],reverse:reverse.has(i+1),sourceId:"bfi2-zh" })),
};
