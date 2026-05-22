---
title: "Google Earthがタイル技術を逆輸入！"
author: "Taichi Furuhashi"
published_at: "2022-01-01"
url: "https://medium.com/furuhashilab/google-earthがタイル技術の逆輸入-9f8537d4b280"
label: "other"
tags: ["taichifuruhashi"]
summary_quality: "full_text_reviewed"
fulltext_source: "medium_url_reader"
---

# Google Earthがタイル技術を逆輸入！

## 概要

Google Maps のプロトタイプを作成し、その後 Google に買収された Where 2 Technologies の Rasmussen兄)弟を中心に、2005年2月にこの世に登場したのがウェブブラウザで快適に表示範囲・縮尺を変更できる Google Maps でした。 当時は AJAX の代表格としても扱われ、同時期にGoogleに買収された Keyhole チームと合流してその後の Google Maps/Earth の発展に寄与したことは知られていますが、その過程の中で生み出されたのが ウェブメルカトル(EPSG:3857, EPSG:900913)と呼ばれるGoogleオリジナルの投影法(単位はm)と、全球画像をピラミッド構造化したXYZタイルと呼ばれるタイルシステムです。

## 重要ポイント

- Google Maps のプロトタイプを作成し、その後 Google に買収された Where 2 Technologies の Rasmussen兄)弟を中心に、2005年2月にこの世に登場したのがウェブブラウザで快適に表示範囲・縮尺を変更できる Google Maps でした。
- # そして2021年、Google Earth にタイルオーバーレイ機能実装！
- 使い方は簡単で、Google Earth（ウェブ用）を用いてストーリーテリングを行うプロジェクト(Projects)機能から「新しいプロジェクト」を作成し、「アイテムを追加」ボタンから「タイルオーバーレイ」を選ぶと、細かなXYZ画像タイルURL等の設定が行なえます。
- 以下は、青山学院大学の相模原キャンパス上空をドローン空撮して作成したオルソモザイク画像タイルです。
- まだ機能が実装されたばかりで、いろいろやりたいことを考えると、機能拡張の余地が十分あるとは思いますが、素直にGoogleが作り出した XYZ画像タイルの仕様を、Google自身が自社プロダクトに逆輸入したこの状況は、地理空間情報の相互運用性(Interoperability)を考える上で非常に重要であり、Googleの英断を評価したいと思います。
- 当時は AJAX の代表格としても扱われ、同時期にGoogleに買収された Keyhole チームと合流してその後の Google Maps/Earth の発展に寄与したことは知られていますが、その過程の中で生み出されたのが ウェブメルカトル(EPSG:3857, EPSG:900913)と呼ばれるGoogleオリジナルの投影法(単位はm)と、全球画像をピラミッド構造化したXYZタイルと呼ばれるタイルシステムです。
- 高速にデータ配信と地図閲覧が行える Google Maps XYZタイルシステムの普及後、ウェブ地図業界ではデファクトスタンダードとなり、OpenStreetMap や Bing Maps、Mapbox、Apple Maps そして地理院地図など主要なウェブ地図サービスではほぼほぼ Google XYZ タイルが採用されている状況です。

## 研究室活動としての意味

高速にデータ配信と地図閲覧が行える Google Maps XYZタイルシステムの普及後、ウェブ地図業界ではデファクトスタンダードとなり、OpenStreetMap や Bing Maps、Mapbox、Apple Maps そして地理院地図など主要なウェブ地図サービスではほぼほぼ Google XYZ タイルが採用されている状況です。 とはいえ、Google Maps/Earth が世に出て15年が過ぎ、世の中の殆どのウェブ地図コンテンツが Google Maps の XYZタイルを採用している中で、同じ Google のジオ・プロダクトである Google Earth は XYZタイルの読み込みができない状況が続いていました。 とは言いつつも、Google Earthも地道に進化は続いており、スタンドアロンツールとしてインストールが必要な Google Earth Pro で GeoJSON ファイルのインポートが一部可能（2021年現在ラインフィーチャのみ）となるなど、近年のFOSS4Gツールとの相互連携が意識され始めているなかで、Google Earth（ウェブ用）の プロジェクト機能についにXYZ画像タイルの読み込みが標準機能として搭載されました！

## 関連する人物・イベント・ツール・地名

### 人物

- Taichi Furuhashi

### イベント

- FOSS4G

### ツール・技術

- OpenStreetMap
- Mapbox
- ドローン
- GeoJSON
- Google Earth

### 地名

- 青山学院大学
- 相模原
- タイ

## NotebookLMで答えられる質問例

- この記事では何を行い、どのような学びや成果が記録されていますか。
- この記事の著者、公開日、元記事URLは何ですか。
- この記事で使われた、または言及されたツール・技術は何ですか。
- この記事に登場する場所はどこですか。
- この記事に関係するイベントや活動名は何ですか。

## 抽出キーワード

- OpenStreetMap
- Mapbox
- ドローン
- GeoJSON
- Google Earth
- FOSS4G
- 青山学院大学
- 相模原
- タイ
- Earthがタイル技術を逆輸入

## 元記事URL

https://medium.com/furuhashilab/google-earthがタイル技術の逆輸入-9f8537d4b280
