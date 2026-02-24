#!/usr/bin/env node
/**
 * LinkTrust AI - 发布讨论脚本
 * 
 * 快速发布讨论到 LinkTrust Forum
 * 
 * 使用方法:
 * node post-discussion.js "标题" "内容" [分类]
 * 
 * 示例:
 * node post-discussion.js "社区周报" "本周动态..." "General"
 * node post-discussion.js "新功能建议" "我建议..." "Ideas"
 */

const { App } = require('octokit');
const fs = require('fs');
const path = require('path');

// ============================================
// 配置
// ============================================
const CONFIG = {
  appId: '2937684',
  installationId: 112126783,
  privateKeyPath: './linktrust-ai.2026-02-24.private-key.pem',
  repo: {
    owner: 'link-trust',
    name: 'forum'
  },
  // 默认分类映射
  defaultCategory: 'Ideas'
};

// 分类名称到 GraphQL ID 的映射（需要首次运行时获取）
let categoryMap = {};

// ============================================
// 初始化
// ============================================
function createApp() {
  const privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8');
  return new App({
    appId: CONFIG.appId,
    privateKey: privateKey,
  });
}

// ============================================
// 获取仓库信息和分类
// ============================================
async function getRepoInfo(octokit) {
  const { repository } = await octokit.graphql(`
    query GetRepoInfo($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
        discussionCategories(first: 20) {
          nodes {
            id
            name
            emoji
          }
        }
      }
    }
  `, {
    owner: CONFIG.repo.owner,
    name: CONFIG.repo.name
  });
  
  // 构建分类映射
  repository.discussionCategories.nodes.forEach(cat => {
    categoryMap[cat.name] = cat.id;
  });
  
  return repository;
}

// ============================================
// 查找分类 ID
// ============================================
function getCategoryId(categoryName) {
  // 尝试精确匹配
  if (categoryMap[categoryName]) {
    return categoryMap[categoryName];
  }
  
  // 尝试不区分大小写匹配
  const lowerName = categoryName.toLowerCase();
  for (const [name, id] of Object.entries(categoryMap)) {
    if (name.toLowerCase() === lowerName) {
      return id;
    }
  }
  
  // 返回默认分类
  console.log(`⚠️  未找到分类 "${categoryName}"，使用默认分类: ${CONFIG.defaultCategory}`);
  return categoryMap[CONFIG.defaultCategory];
}

// ============================================
// 创建讨论
// ============================================
async function createDiscussion(octokit, repositoryId, categoryId, title, body) {
  // 添加 AI 签名
  const fullBody = `${body}

---

🤖 **LinkTrust AI Assistant**
- 身份：GitHub App 官方机器人  
- 类型：AI 生成内容
- App ID：${CONFIG.appId}

*由 LinkTrust 社区管理团队运营*`

  const result = await octokit.graphql(`
    mutation CreateDiscussion($input: CreateDiscussionInput!) {
      createDiscussion(input: $input) {
        discussion {
          id
          number
          title
          url
          category {
            name
            emoji
          }
          author {
            login
          }
          createdAt
        }
      }
    }
  `, {
    input: {
      repositoryId: repositoryId,
      categoryId: categoryId,
      title: title,
      body: fullBody
    }
  });
  
  return result.createDiscussion.discussion;
}

// ============================================
// 主函数
// ============================================
async function main() {
  const args = process.argv.slice(2);
  
  // 显示帮助
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
用法: node post-discussion.js <标题> <内容> [分类]

参数:
  标题    讨论的标题（必填）
  内容    讨论的内容，支持 Markdown（必填）
  分类    讨论分类，可选（默认: Ideas）

可用分类:
  - Announcements  📣  公告
  - General        💬  一般讨论
  - Ideas          💡  想法建议
  - Polls          🗳️  投票
  - Q&A            🙏  问答
  - Show and tell  🙌  展示分享

示例:
  node post-discussion.js "社区周报 #1" "本周社区动态..." "General"
  node post-discussion.js "新功能建议" "我建议增加..." "Ideas"
  
  # 从文件读取内容
  node post-discussion.js "每周一问" "$(cat question.md)" "Q&A"
`);
    process.exit(0);
  }
  
  // 检查参数
  if (args.length < 2) {
    console.error('❌ 错误: 需要提供标题和内容');
    console.log('\n使用 --help 查看用法');
    process.exit(1);
  }
  
  const [title, body, categoryName = CONFIG.defaultCategory] = args;
  
  console.log('📝 LinkTrust AI - 发布讨论');
  console.log('==============================================\n');
  console.log(`标题: ${title}`);
  console.log(`分类: ${categoryName}`);
  console.log('');
  
  // 检查私钥
  if (!fs.existsSync(CONFIG.privateKeyPath)) {
    console.error(`❌ 错误: 找不到私钥文件 ${CONFIG.privateKeyPath}`);
    console.log('\n请将 GitHub App 的私钥文件 (.pem) 复制到本目录');
    process.exit(1);
  }
  
  try {
    // 初始化
    console.log('🔄 正在初始化...');
    const app = createApp();
    const octokit = await app.getInstallationOctokit(CONFIG.installationId);
    console.log('✅ 认证成功\n');
    
    // 获取仓库信息
    console.log('🔄 获取仓库信息...');
    const repo = await getRepoInfo(octokit);
    console.log(`✅ 找到 ${Object.keys(categoryMap).length} 个分类\n`);
    
    // 查找分类
    const categoryId = getCategoryId(categoryName);
    if (!categoryId) {
      console.error(`❌ 错误: 无法找到分类 "${categoryName}"`);
      console.log('可用分类:', Object.keys(categoryMap).join(', '));
      process.exit(1);
    }
    
    // 创建讨论
    console.log('🔄 创建讨论...');
    const discussion = await createDiscussion(
      octokit,
      repo.id,
      categoryId,
      title,
      body
    );
    
    console.log('\n✅ 讨论创建成功!');
    console.log('==============================================');
    console.log(`编号: #${discussion.number}`);
    console.log(`标题: ${discussion.title}`);
    console.log(`分类: ${discussion.category.emoji} ${discussion.category.name}`);
    console.log(`作者: ${discussion.author.login}`);
    console.log(`时间: ${discussion.createdAt}`);
    console.log('----------------------------------------------');
    console.log(`链接: ${discussion.url}`);
    console.log('==============================================');
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    if (error.response?.errors) {
      console.error('详情:', JSON.stringify(error.response.errors, null, 2));
    }
    process.exit(1);
  }
}

main();
