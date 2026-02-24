#!/usr/bin/env node
/**
 * LinkTrust Forum - Unified Interaction Script
 * 
 * Usage:
 *   node forum.js post "标题" "内容" "分类"
 *   node forum.js reply 12 "回复内容"
 *   node forum.js list
 *   node forum.js test
 */

const { App } = require('octokit');
const fs = require('fs');
const path = require('path');

// ============================================
// Configuration
// ============================================
const CONFIG = {
  appId: '2937684',
  installationId: 112126783,
  privateKeyPath: path.join(__dirname, 'linktrust-ai.2026-02-24.private-key.pem'),
  repo: {
    owner: 'link-trust',
    name: 'forum'
  }
};

// Categories mapping
const CATEGORIES = {
  'announcements': { id: 'DIC_kwDORPSLgM4C2V1C', name: 'Announcements', emoji: '📣' },
  'general': { id: 'DIC_kwDORPSLgM4C2V1D', name: 'General', emoji: '💬' },
  'ideas': { id: 'DIC_kwDORPSLgM4C2V1F', name: 'Ideas', emoji: '💡' },
  'polls': { id: 'DIC_kwDORPSLgM4C2V1E', name: 'Polls', emoji: '🗳️' },
  'q&a': { id: 'DIC_kwDORPSLgM4C2V1G', name: 'Q&A', emoji: '🙏' },
  'show and tell': { id: 'DIC_kwDORPSLgM4C2V1H', name: 'Show and tell', emoji: '🙌' }
};

// ============================================
// Initialize GitHub App
// ============================================
function createApp() {
  if (!fs.existsSync(CONFIG.privateKeyPath)) {
    throw new Error(`Private key not found: ${CONFIG.privateKeyPath}`);
  }
  
  const privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8');
  return new App({
    appId: CONFIG.appId,
    privateKey: privateKey,
  });
}

async function getOctokit() {
  const app = createApp();
  return app.getInstallationOctokit(CONFIG.installationId);
}

// ============================================
// Get Repository Info
// ============================================
async function getRepoInfo(octokit) {
  const result = await octokit.graphql(`
    query {
      repository(owner: "link-trust", name: "forum") {
        id
        discussionCategories(first: 10) {
          nodes {
            id
            name
            emoji
          }
        }
      }
    }
  `);
  
  // Build category map
  const categoryMap = {};
  result.repository.discussionCategories.nodes.forEach(cat => {
    categoryMap[cat.name.toLowerCase()] = cat.id;
  });
  
  return { repoId: result.repository.id, categoryMap };
}

// ============================================
// Get Discussion ID by Number
// ============================================
async function getDiscussionId(octokit, discussionNumber) {
  const result = await octokit.graphql(`
    query GetDiscussion($num: Int!) {
      repository(owner: "link-trust", name: "forum") {
        discussion(number: $num) {
          id
          title
        }
      }
    }
  `, {
    num: discussionNumber
  });
  
  if (!result.repository.discussion) {
    throw new Error(`Discussion #${discussionNumber} not found`);
  }
  
  return result.repository.discussion.id;
}

// ============================================
// Actions
// ============================================

// Test connection
async function actionTest() {
  console.log('🔄 Testing GitHub App connection...\n');
  
  const app = createApp();
  const { data } = await app.octokit.rest.apps.getAuthenticated();
  
  console.log('✅ Connection successful!');
  console.log(`   App Name: ${data.name}`);
  console.log(`   App ID: ${data.id}`);
  console.log('');
  
  const octokit = await getOctokit();
  const { repository } = await getRepoInfo(octokit);
  
  console.log(`✅ Repository: ${CONFIG.repo.owner}/${CONFIG.repo.name}`);
  console.log(`   Categories: ${Object.keys(CATEGORIES).join(', ')}`);
  console.log('');
  
  return true;
}

// List discussions
async function actionList() {
  console.log(`📋 Listing discussions from ${CONFIG.repo.owner}/${CONFIG.repo.name}\n`);
  
  const octokit = await getOctokit();
  
  const result = await octokit.graphql(`
    query {
      repository(owner: "link-trust", name: "forum") {
        discussions(first: 20, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            number
            title
            category {
              name
              emoji
            }
            author {
              login
            }
            comments {
              totalCount
            }
            createdAt
          }
        }
      }
    }
  `);
  
  console.log('| # | Title | Category | Author | Comments |');
  console.log('|---|-------|----------|--------|----------|');
  
  result.repository.discussions.nodes.forEach(d => {
    const date = new Date(d.createdAt).toLocaleDateString('zh-CN');
    console.log(`| ${d.number} | ${d.title.slice(0, 30)} | ${d.category.emoji} ${d.category.name} | ${d.author.login} | ${d.comments.totalCount} |`);
  });
  
  return result.repository.discussions.nodes;
}

// Post new discussion
async function actionPost(title, body, categoryName = 'General') {
  console.log(`📝 Posting new discussion...`);
  console.log(`   Title: ${title}`);
  console.log(`   Category: ${categoryName}\n`);
  
  const octokit = await getOctokit();
  const { repoId, categoryMap } = await getRepoInfo(octokit);
  
  // Find category
  const categoryId = categoryMap[categoryName.toLowerCase()];
  if (!categoryId) {
    console.log(`⚠️ Unknown category "${categoryName}", using General`);
    categoryId = categoryMap['general'];
  }
  
  // Add signature
  const fullBody = `${body}

---

🤖 **LinkTrust AI Assistant**
- 身份：GitHub App 官方机器人
- 类型：AI 生成内容

*由 LinkTrust 社区 AI 助手发布*`;
  
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
      repositoryId: repoId,
      categoryId: categoryId,
      title: title,
      body: fullBody
    }
  });
  
  const d = result.createDiscussion.discussion;
  console.log('✅ Discussion created!');
  console.log(`   Number: #${d.number}`);
  console.log(`   Title: ${d.title}`);
  console.log(`   Category: ${d.category.emoji} ${d.category.name}`);
  console.log(`   Author: ${d.author.login}`);
  console.log(`   URL: ${d.url}`);
  
  return d;
}

// Reply to discussion
async function actionReply(discussionNumber, body) {
  console.log(`💬 Replying to discussion #${discussionNumber}...\n`);
  
  const octokit = await getOctokit();
  const discussionId = await getDiscussionId(octokit, discussionNumber);
  
  const result = await octokit.graphql(`
    mutation AddComment($input: AddDiscussionCommentInput!) {
      addDiscussionComment(input: $input) {
        comment {
          id
          url
        }
      }
    }
  `, {
    input: {
      discussionId: discussionId,
      body: body
    }
  });
  
  console.log('✅ Comment added!');
  console.log(`   URL: ${result.addDiscussionComment.comment.url}`);
  
  return result.addDiscussionComment.comment;
}

// ============================================
// Main
// ============================================
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'test':
        await actionTest();
        break;
        
      case 'list':
        await actionList();
        break;
        
      case 'post':
        if (args.length < 3) {
          console.error('Usage: node forum.js post "标题" "内容" "分类"');
          process.exit(1);
        }
        await actionPost(args[1], args[2], args[3]);
        break;
        
      case 'reply':
        if (args.length < 3) {
          console.error('Usage: node forum.js reply 12 "回复内容"');
          process.exit(1);
        }
        await actionReply(parseInt(args[1]), args[2]);
        break;
        
      default:
        console.log(`
LinkTrust Forum CLI

Usage:
  node forum.js test                  - Test connection
  node forum.js list                  - List recent discussions
  node forum.js post "标题" "内容" "分类" - Post new discussion
  node forum.js reply 12 "内容"        - Reply to discussion

Categories:
  Announcements, General, Ideas, Polls, Q&A, Show and tell

Examples:
  node forum.js post "你好" "欢迎大家" "General"
  node forum.js reply 12 "我也这么觉得！"
  node forum.js list
`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
