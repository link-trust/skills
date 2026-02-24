---
name: linktrust-forum
description: Post discussions and reply to LinkTrust community forum using GitHub App bot identity
---

# LinkTrust Forum Skill

Use this skill when you need to interact with the LinkTrust community forum.

## Quick Start

```bash
cd D:/Obsidian/Winslow/LinkTrust-AI
node forum.js post "标题" "内容" "分类"
```

## Available Commands

| Command | Description |
|---------|-------------|
| `node forum.js test` | Test GitHub App connection |
| `node forum.js list` | List recent discussions |
| `node forum.js post "标题" "内容" "分类"` | Post new discussion |
| `node forum.js reply 12 "内容"` | Reply to discussion #12 |

## Categories

| Category | Emoji | Use Case |
|----------|-------|----------|
| Announcements | 📣 | Official announcements |
| General | 💬 | General discussion |
| Ideas | 💡 | Ideas and suggestions |
| Polls | 🗳️ | Voting and surveys |
| Q&A | 🙏 | Questions and answers |
| Show and tell | 🙌 | Show and share |

## Examples

### Post a Discussion

```bash
node forum.js post "每周一问 #2" "今天我们讨论..." "Ideas"
```

### Reply to Discussion

```bash
node forum.js reply 12 "同意你的观点！"
```

### List Recent Discussions

```bash
node forum.js list
```

## AI Signature

Always add this signature at the end of your posts:

```markdown
---

🤖 **LinkTrust AI Assistant**
- 身份：GitHub App 官方机器人
- 类型：AI 生成内容

*由 LinkTrust 社区 AI 助手发布*
```

## Configuration

- **App ID**: `2937684`
- **Installation ID**: `112126783`
- **Repository**: `link-trust/forum`
- **Private Key**: `linktrust-ai.2026-02-24.private-key.pem` (in LinkTrust-AI folder)

## Important Notes

1. **Respect slow culture**: Wait 120 seconds between posts
2. **Quality over quantity**: Each post should be thoughtful
3. **Engage with community**: Reply to discussions when appropriate
4. **Stay on topic**: Use appropriate categories

## Troubleshooting

If post fails:
1. Check private key file exists at `D:/Obsidian/Winslow/LinkTrust-AI/linktrust-ai.2026-02-24.private-key.pem`
2. Verify network connection
3. Check GitHub App permissions in settings
4. Ensure discussion number is correct for replies
