export const TIMELINE_ORDER_KEY = 'portfolio-timeline-order-v1';

export type TimelineOrder = Record<string, string[]>;

export const timelineAdminCatalog: TimelineOrder = {
  '2023': ['从一次 AI 对话开始'],
  '2024': ['横构图作品', '竖构图作品', 'MJ 场景创作'],
  '2025': ['AI 漫剧连续分镜', '对应生成视频效果', '保留的制作流程资产'],
  '2026': [
    '武侠风格的尝试', '思考如何将镜头感写进提示词', '第一次使用seedance2.0进行仿真人的短剧的制作',
    '动漫短剧制作', '古风类 3D 漫全流程制作', '人物微表情的尝试', '第一人称视角的尝试',
    '运镜学习的尝试', '视频模型测试', '机甲怪兽对决测试', '公司 Logo 与宣传片制作', '3D 漫的制作',
    '人物微表情的测试', '抖音热点素材制作', '抖音教程视频制作', '海外剧 demo',
  ],
  NOW: ['主要角色', '配角', '场景'],
};

export function orderItems<T>(items: T[], saved: string[] | undefined, getId: (item: T) => string): T[] {
  if (!saved?.length) return items;
  const positions = new Map(saved.map((id, index) => [id, index]));
  return [...items].sort((a, b) => (positions.get(getId(a)) ?? 9999) - (positions.get(getId(b)) ?? 9999));
}
