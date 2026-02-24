#!/usr/bin/env node
/**
 * LinkTrust AI - GitHub App 测试脚本
 * 
 * 使用方法:
 * 1. 确保已安装依赖: npm install octokit
 * 2. 将私钥文件放在同一目录: linktrust-ai.private-key.pem
 * 3. 运行: node test-github-app.js
 */

const { App } = require('octokit');
const fs = require('fs');
const path = require('path');

// ============================================
// 配置信息
// ============================================
const CONFIG = {
  appId: '2937684',
  installationId: 112126783,
  privateKeyPath: './linktrust-ai.2026-02-24.private-key.pem',
  repo: {
    owner: 'link-trust',
    name: 'forum'
  }
};

// ============================================
// 初始化 GitHub App
// ============================================
function createApp() {
  const privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8');
  
  return new App({
    appId: CONFIG.appId,
    privateKey: privateKey,
  });
}

// ============================================
// 测试 1: 验证连接
// ============================================
async function testConnection() {
  console.log('🔄 测试 1: 验证 GitHub App 连接...');
  
  try {
    const app = createApp();
    const { data } = await app.octokit.rest.apps.getAuthenticated();
    
    console.log('✅ 连接成功!');
    console.log(`   App 名称: ${data.name}`);
    console.log(`   App ID: ${data.id}`);
    console.log(`   创建时间: ${data.created_at}`);
    return true;
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    return false;
  }
}

// ============================================
// 测试 2: 验证 Installation
// ============================================
async function testInstallation() {
  console.log('\n🔄 测试 2: 验证 Installation...');
  
  try {
    const app = createApp();
    const { data } = await app.octokit.rest.apps.getInstallation({
      installation_id: CONFIG.installationId
    });
    
    console.log('✅ Installation 验证成功!');
    console.log(`   安装目标: ${data.account.login}`);
    console.log(`   安装 ID: ${data.id}`);
    console.log(`   权限:`, Object.keys(data.permissions).join(', '));
    return true;
  } catch (error) {
    console.error('❌ Installation 验证失败:', error.message);
    return false;
  }
}

// ============================================
// 测试 3: 创建测试讨论（使用 GraphQL）
// ============================================
async function createTestDiscussion() {
  console.log('\n🔄 测试 3: 创建测试讨论...');
  
  try {
    const app = createApp();
    const octokit = await app.getInstallationOctokit(CONFIG.installationId);
    
    // 获取仓库 ID
    const { repository } = await octokit.graphql(`
      query GetRepoId($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          id
          discussionCategories(first: 10) {
            nodes {
              id
              name
            }
          }
        }
      }
    `, {
      owner: CONFIG.repo.owner,
      name: CONFIG.repo.name
    });
    
    console.log(`   仓库 ID: ${repository.id}`);
    console.log('   可用分类:', repository.discussionCategories.nodes.map(c => c.name).join(', '));
    
    // 找到 Ideas 分类
    const ideasCategory = repository.discussionCategories.nodes.find(
      c => c.name === 'Ideas'
    );
    
    if (!ideasCategory) {
      throw new Error('未找到 Ideas 分类');
    }
    
    // 创建讨论
    const result = await octokit.graphql(`
      mutation CreateDiscussion($input: CreateDiscussionInput!) {
        createDiscussion(input: $input) {
          discussion {
            id
            number
            title
            url
            author {
              login
            }
          }
        }
      }
    `, {
      input: {
        repositoryId: repository.id,
        categoryId: ideasCategory.id,
        title: '🤖 LinkTrust-AI 机器人身份测试',
        body: `## 测试帖子

这是由 LinkTrust-AI GitHub App 发布的测试讨论。

### 测试内容
- ✅ GitHub App 认证
- ✅ Installation Token 获取
- ✅ GraphQL API 调用
- ✅ 讨论创建

### 身份标识
🤖 **LinkTrust AI Assistant**
- 类型：GitHub App 官方机器人
- App ID：${CONFIG.appId}
- Installation ID：${CONFIG.installationId}

---
*此帖子用于验证 AI 机器人身份，测试完成后可由管理员删除。*
`
      }
    });
    
    const discussion = result.createDiscussion.discussion;
    console.log('✅ 讨论创建成功!');
    console.log(`   编号: #${discussion.number}`);
    console.log(`   标题: ${discussion.title}`);
    console.log(`   作者: ${discussion.author.login}`);
    console.log(`   链接: ${discussion.url}`);
    
    return discussion.url;
  } catch (error) {
    console.error('❌ 创建讨论失败:', error.message);
    if (error.response) {
      console.error('   错误详情:', error.response.data || error.response.errors);
    }
    return null;
  }
}

// ============================================
// 主函数
// ============================================
async function main() {
  console.log('==============================================');
  console.log('  LinkTrust AI - GitHub App 测试脚本');
  console.log('==============================================\n');
  
  // 检查私钥文件
  if (!fs.existsSync(CONFIG.privateKeyPath)) {
    console.error(`❌ 错误: 找不到私钥文件 ${CONFIG.privateKeyPath}`);
    console.log('\n请将 GitHub App 的私钥文件 (.pem) 复制到本目录，并重命名为:');
    console.log('   linktrust-ai.private-key.pem');
    process.exit(1);
  }
  
  // 运行测试
  const test1 = await testConnection();
  if (!test1) process.exit(1);
  
  const test2 = await testInstallation();
  if (!test2) process.exit(1);
  
  const discussionUrl = await createTestDiscussion();
  
  console.log('\n==============================================');
  if (discussionUrl) {
    console.log('✅ 所有测试通过!');
    console.log(`\n📝 测试讨论已创建:`);
    console.log(`   ${discussionUrl}`);
  } else {
    console.log('❌ 测试未完全通过');
  }
  console.log('==============================================');
}

// 运行
main().catch(console.error);
