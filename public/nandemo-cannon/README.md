# なんでもキャノン 紹介ページ
公開先: https://rabbitdaisuke.github.io/blog/nandemo-cannon/
プレイ先: https://rabbitdaisuke.github.io/nandemo-cannon/
## 画像と公開
JPEGは品質95で保存済み。JPEGにはWebPの参照を付けず、そのまま配信する。
PNGは元画像を同梱し、既存のGitHub Actionsが公開時に生成するWebPをpicture要素で参照する。事前変換はしていない。ローカルでWebPが存在しない場合は元のPNGを表示する。
既存のActionsとbuild-webp.shは変更していない。
## ギャラリー
中央の大きな1枚に、左右1枚ずつを重ねて計3枚を表示する。画像6枚とYouTube動画1本を1つのギャラリーで循環させ、ドット、マウスドラッグ、タッチスワイプ、左右キーで移動できる。画像と動画を分けるタブや別枠、左右の矢印ボタン、画面内の操作説明は設けていない。
動画はYouTube IFrame Player APIで終了を検知し、最初の画像へ戻してギャラリーにスクロールする。動画は自動再生しない。
マウスドラッグには添付のdragscroll 0.0.8を使用。MITライセンス全文はvendor/dragscroll.LICENSEに同梱。
## 検索と共有
既存ページと同じGoogle Analytics設定、description、keywords、OGP、Twitter Cardを設定し、canonicalとVideoGame構造化データも付与している。
