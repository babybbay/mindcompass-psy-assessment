import { defaultScoring, generalLimit, likert5, type Scale } from './types';
export const legacy: Scale = {
  "id": "legacy",
  "version": "v1-preserved-2026-09-12",
  "versionDate": "2026-09-12",
  "name": "旧版28题探索问卷",
  "category": "legacy",
  "language": "zh-CN",
  "purpose": "保留第一版大五与AI问卷，用于追溯与体验比较。",
  "minutes": "8–10",
  "exploratory": true,
  "instructions": "按通常的自己作答。此为旧版题目，不能与新版量表混合分析。",
  "limitations": "旧版题目来源及改写过程未能完整追溯；不是标准大五量表。AI综合指标包含不同构念，不宜视为单一潜变量。",
  "source": {
    "id": "legacy-v1",
    "citation": "MindCompass v1，原项目提交9ea9e59。",
    "url": "",
    "permission": "原项目已有题目；来源待人工追溯，不宣称第三方授权或原创归属。",
    "adaptation": "原样保留28题、原维度映射和反向键；去掉无依据高低阈值。"
  },
  "dimensions": [
    {
      "id": "extraversion",
      "name": "外向性",
      "description": "仅描述旧版题目中的自报倾向；无常模，不表示优劣。"
    },
    {
      "id": "agreeableness",
      "name": "宜人性",
      "description": "仅描述旧版题目中的自报倾向；无常模，不表示优劣。"
    },
    {
      "id": "conscientiousness",
      "name": "尽责性",
      "description": "仅描述旧版题目中的自报倾向；无常模，不表示优劣。"
    },
    {
      "id": "neuroticism",
      "name": "情绪敏感性",
      "description": "仅描述旧版题目中的自报倾向；无常模，不表示优劣。"
    },
    {
      "id": "openness",
      "name": "开放性",
      "description": "仅描述旧版题目中的自报倾向；无常模，不表示优劣。"
    },
    {
      "id": "aiAttitude",
      "name": "审慎采纳AI",
      "description": "仅描述旧版题目中的自报倾向；无常模，不表示优劣。"
    }
  ],
  "items": [
    {
      "id": "P1",
      "text": "我喜欢置身于热闹、有人交流的环境中。",
      "reverse": false,
      "dimensionId": "extraversion",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P2",
      "text": "我往往更容易挑别人的毛病。",
      "reverse": true,
      "dimensionId": "agreeableness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P3",
      "text": "我能有条理地完成自己承诺的事情。",
      "reverse": false,
      "dimensionId": "conscientiousness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P4",
      "text": "我容易感到紧张或担忧。",
      "reverse": false,
      "dimensionId": "neuroticism",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P5",
      "text": "我对抽象的想法和新观点感兴趣。",
      "reverse": false,
      "dimensionId": "openness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P6",
      "text": "我通常比较安静，不太主动说话。",
      "reverse": true,
      "dimensionId": "extraversion",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P7",
      "text": "我愿意体谅他人的感受与需要。",
      "reverse": false,
      "dimensionId": "agreeableness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P8",
      "text": "我常常拖到最后一刻才处理重要任务。",
      "reverse": true,
      "dimensionId": "conscientiousness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P9",
      "text": "在压力情境下，我通常能保持平静。",
      "reverse": true,
      "dimensionId": "neuroticism",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P10",
      "text": "我不太喜欢尝试与平常不同的做法。",
      "reverse": true,
      "dimensionId": "openness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P11",
      "text": "和陌生人互动时，我通常很快能打开话题。",
      "reverse": false,
      "dimensionId": "extraversion",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P12",
      "text": "如果别人做得不够好，我会不耐烦。",
      "reverse": true,
      "dimensionId": "agreeableness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P13",
      "text": "我会提前规划，并按计划推进任务。",
      "reverse": false,
      "dimensionId": "conscientiousness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P14",
      "text": "我常常反复思考可能出错的事情。",
      "reverse": false,
      "dimensionId": "neuroticism",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P15",
      "text": "我享受探索陌生领域，即使一开始不熟悉。",
      "reverse": false,
      "dimensionId": "openness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P16",
      "text": "我倾向于回避成为人群关注的焦点。",
      "reverse": true,
      "dimensionId": "extraversion",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P17",
      "text": "即使意见不同，我也会认真倾听他人的理由。",
      "reverse": false,
      "dimensionId": "agreeableness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P18",
      "text": "我有时会因为分心而遗漏细节。",
      "reverse": true,
      "dimensionId": "conscientiousness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P19",
      "text": "情绪波动会明显影响我的日常状态。",
      "reverse": false,
      "dimensionId": "neuroticism",
      "sourceId": "legacy-v1"
    },
    {
      "id": "P20",
      "text": "比起新方法，我更愿意坚持熟悉的方式。",
      "reverse": true,
      "dimensionId": "openness",
      "sourceId": "legacy-v1"
    },
    {
      "id": "AI1",
      "text": "我愿意尝试用生成式 AI 帮助我学习或解决问题。",
      "reverse": false,
      "dimensionId": "aiAttitude",
      "sourceId": "legacy-v1"
    },
    {
      "id": "AI2",
      "text": "在合适的任务中，AI 可以帮助我提高效率。",
      "reverse": false,
      "dimensionId": "aiAttitude",
      "sourceId": "legacy-v1"
    },
    {
      "id": "AI3",
      "text": "使用 AI 时，我会核查关键事实、来源或推理。",
      "reverse": false,
      "dimensionId": "aiAttitude",
      "sourceId": "legacy-v1"
    },
    {
      "id": "AI4",
      "text": "我认为了解 AI 的局限与偏差很重要。",
      "reverse": false,
      "dimensionId": "aiAttitude",
      "sourceId": "legacy-v1"
    },
    {
      "id": "AI5",
      "text": "只要 AI 的回答听起来合理，我通常不会再核实。",
      "reverse": true,
      "dimensionId": "aiAttitude",
      "sourceId": "legacy-v1"
    },
    {
      "id": "AI6",
      "text": "我会考虑使用 AI 是否会影响公平、隐私或他人权益。",
      "reverse": false,
      "dimensionId": "aiAttitude",
      "sourceId": "legacy-v1"
    },
    {
      "id": "AI7",
      "text": "即使不了解数据如何被使用，我也不介意输入敏感信息。",
      "reverse": true,
      "dimensionId": "aiAttitude",
      "sourceId": "legacy-v1"
    },
    {
      "id": "AI8",
      "text": "我希望学习如何与 AI 协作，而不是完全依赖它替我判断。",
      "reverse": false,
      "dimensionId": "aiAttitude",
      "sourceId": "legacy-v1"
    }
  ]
, options: likert5, scoring: defaultScoring
};
legacy.limitations += generalLimit;
