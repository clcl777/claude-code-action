# OAuth Token Debug Guide

## 🔍 問題の特定と解決手順

### 1. ローカルでの確認

```bash
# 1. デバッグスクリプトを実行
./debug-oauth.sh

# 2. 出力を確認して以下をチェック:
# - Token が存在するか
# - Token が期限切れかどうか
# - 実際のAPI呼び出しが成功するか
```

### 2. GitHub Actions でのデバッグ

1. **手動実行**:
   - GitHub リポジトリ → Actions タブ
   - "Debug OAuth Authentication" ワークフローを選択
   - "Run workflow" をクリック

2. **コメントトリガー**:
   - Issue または PR に `@claude-debug` とコメント

### 3. ログの確認ポイント

#### ✅ 正常な場合のログ例:
```
📋 OAuth Token Status
ACCESS_TOKEN length: 89
REFRESH_TOKEN length: 89
EXPIRES_AT: 1705123456789
✅ Token appears valid
🧪 Testing Token with Direct API Call
✅ Direct API call SUCCESS!
🔄 Testing OAuth Refresh Logic
✅ OAuth setup successful
```

#### ❌ 問題がある場合のログ例:
```
❌ Token is EXPIRED!
❌ Direct API call FAILED - 401 Unauthorized
❌ OAuth setup failed: Failed to refresh OAuth token
```

### 4. よくある問題と解決策

| 問題 | 症状 | 解決策 |
|------|------|--------|
| **Token 期限切れ** | `401 Unauthorized` | [手順5](#5-token-の手動更新) |
| **Token が空** | `ACCESS_TOKEN length: 0` | [手順6](#6-oauth-credentials-の再取得) |
| **形式が間違い** | `Invalid timestamp` | `CLAUDE_EXPIRES_AT` を確認 |
| **Refresh 失敗** | `refresh_token: invalid_token` | 新しい Refresh Token が必要 |

### 5. Token の手動更新

```bash
# 1. Claude CLI で再認証
claude

# 2. 認証後、新しい credentials を確認
./debug-oauth.sh

# 3. GitHub Secrets を更新
# Settings → Secrets → Actions で以下を更新:
# - CLAUDE_ACCESS_TOKEN
# - CLAUDE_REFRESH_TOKEN  
# - CLAUDE_EXPIRES_AT
```

### 6. OAuth Credentials の再取得

```bash
# 1. 既存の credentials をバックアップ
cp ~/.claude/.credentials.json ~/.claude/.credentials.json.backup

# 2. credentials を削除
rm ~/.claude/.credentials.json

# 3. 再認証
claude
# ブラウザが開いて OAuth フローが開始されます

# 4. 新しい credentials を確認
./debug-oauth.sh
```

### 7. 高度なデバッグ

#### API呼び出しの詳細ログ

```bash
# Token refresh の詳細を確認
curl -v -X POST "https://api.claude.ai/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=YOUR_REFRESH_TOKEN"
```

#### ネットワーク問題の確認

```bash
# Claude API への接続確認
curl -I https://api.anthropic.com/v1/messages
curl -I https://api.claude.ai/oauth/token
```

### 8. 問題解決のチェックリスト

- [ ] `~/.claude/.credentials.json` が存在する
- [ ] Token が期限内である
- [ ] GitHub Secrets が正しく設定されている
- [ ] `CLAUDE_EXPIRES_AT` がミリ秒タイムスタンプである
- [ ] Direct API呼び出しが成功する
- [ ] OAuth Refresh Logic が動作する

### 9. サポートが必要な場合

以下の情報を準備してください:

1. **ローカルデバッグの出力**:
   ```bash
   ./debug-oauth.sh > debug-output.txt 2>&1
   ```

2. **GitHub Actions のログ** (機密情報を除く):
   - "Debug OAuth Authentication" ワークフローの全ログ

3. **エラーメッセージ**:
   - 具体的な401エラーの内容
   - ベースアクションのエラー出力

4. **環境情報**:
   - Claude Max プラン加入状況
   - 最後にclaude CLIを使用した時期 