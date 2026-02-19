# 🧭 Dream Compass デプロイガイド

## 全体構成

```
Vercel (フロントエンド + ホスティング)  ← 無料
  ├── React (Vite)
  └── Claude API (ブラウザから直接呼び出し)

Stripe (月額課金 ¥980)  ← 決済手数料 3.6%のみ
```

---

## ステップ1: 事前準備（アカウント作成）

### 1-1. Vercel アカウント
1. https://vercel.com にアクセス
2. 「Sign Up」→ GitHubアカウントで登録

### 1-2. Anthropic API キー
1. https://console.anthropic.com にアクセス
2. アカウント作成 → API Keys → 新しいキーを作成
3. キーをメモしておく（`sk-ant-...`で始まる）

### 1-3. Stripe アカウント（課金用）
1. https://dashboard.stripe.com/register で登録
2. 本番利用には本人確認が必要（後でOK）

---

## ステップ2: Stripeで月額プランを作成

### Stripe ダッシュボードで操作
1. https://dashboard.stripe.com/products → 「商品を追加」
2. 商品名: `Dream Compass Pro`
3. 価格: `¥980` / `月額` / `日本円`
4. 「商品を保存」
5. 作成された **Price ID** をメモ（`price_xxxxx`で始まる）

### APIキーを取得
1. https://dashboard.stripe.com/apikeys
2. 「公開可能キー」（`pk_test_...`）をメモ
3. 「シークレットキー」（`sk_test_...`）をメモ

> 💡 最初は `test` モードで開発。本番時に `live` キーに切り替え

---

## ステップ3: GitHubにプッシュ

ターミナルで以下を実行:

```bash
# プロジェクトフォルダに移動
cd dream-compass-deploy

# Git初期化
git init
git add .
git commit -m "Initial commit - Dream Compass"

# GitHubでリポジトリ作成後
git remote add origin https://github.com/あなたのユーザー名/dream-compass.git
git branch -M main
git push -u origin main
```

---

## ステップ4: Vercelにデプロイ

### 4-1. プロジェクトをインポート
1. https://vercel.com/dashboard → 「Add New Project」
2. GitHubリポジトリ `dream-compass` を選択
3. Framework Preset: `Vite` を選択

### 4-2. 環境変数を設定
「Environment Variables」セクションで以下を追加:

| Key | Value |
|-----|-------|
| `VITE_ANTHROPIC_API_KEY` | `sk-ant-...`（Anthropic APIキー） |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...`（Stripe公開キー） |

4. 「Deploy」をクリック

### 4-3. デプロイ完了！
- URLが発行される: `https://dream-compass-xxxxx.vercel.app`
- カスタムドメインも設定可能（Settings → Domains）

---

## ステップ5: 月額課金（Stripe）の組み込み

### 現在の状態
今のアプリは「初回無料分析」が動く状態です。
月額課金を追加するには、以下の2つの方法があります:

### 方法A: Stripe Payment Links（最速・コード不要）
1. Stripe Dashboard → 「支払いリンク」→ 作成
2. 商品: Dream Compass Pro (¥980/月)
3. 発行されたURLをアプリ内に埋め込む

### 方法B: Stripe Checkout（推奨・本格的）
アプリ内に課金ゲートを追加する場合は、
追加の実装が必要です。ご希望があればお伝えください。

---

## ステップ6: カスタムドメイン設定（任意）

1. Vercel Dashboard → Settings → Domains
2. ドメインを追加（例: `dreamcompass.jp`）
3. DNS設定をドメイン管理画面で変更
4. SSL証明書は自動発行

---

## コスト一覧

| 項目 | 月額 |
|------|------|
| Vercel (Hobby) | ¥0 |
| Anthropic API | 使った分だけ（1回 約¥10-18） |
| Stripe 手数料 | 売上の 3.6% |
| ドメイン（任意） | 年間 ¥1,000-3,000 |

### 収益シミュレーション（月100人契約の場合）
- 売上: ¥98,000
- Stripe手数料: -¥3,528
- API費用（月5回/人平均）: -¥9,000
- **利益: 約¥85,000/月**

---

## トラブルシューティング

### ビルドエラーが出る場合
```bash
npm install
npm run build
```
ローカルでビルドが通るか確認

### API呼び出しが失敗する場合
- 環境変数 `VITE_ANTHROPIC_API_KEY` が正しく設定されているか確認
- Anthropic Console でAPIキーが有効か確認
- 使用制限に達していないか確認

### Stripeの決済が動かない場合
- テストモード/本番モードのキーが一致しているか確認
- Webhookが正しく設定されているか確認

---

## 次のステップ（今後の拡張）

1. **ユーザー認証の追加** — Supabase Auth or Firebase Auth
2. **Stripe Checkout統合** — 初回分析後に課金ゲート
3. **分析結果の保存** — Supabase DB
4. **LP（ランディングページ）** — コンバージョン向上
5. **OGP/シェア機能** — SNS拡散
