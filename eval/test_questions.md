# NotebookLM評価質問セット

入力ソース: `distilled/` 配下のNotebookLM用Markdown。`cleaned/` は存在しないため、同等の投入用ソースとして直近生成済みの `distilled/` を参照対象にする。

## 1. 事実確認 8問

### Q01
- 質問文: `08_timeline_index.md` によると、時系列索引の対象記事数は何件ですか。
- 期待される回答の要点: 対象記事数は464件。全記事を対象としている。
- 参照すべきソースファイル: `distilled/08_timeline_index.md`、テーマ: 時系列索引
- 評価観点: 件数を正確に答える。余計な推測を加えない。
- NG回答例: 「約500件」「最新10件だけ」など、ソースと異なる件数を答える。

### Q02
- 質問文: 「Furuhashi Lab. was born in 2017」は、いつ公開され、著者は誰ですか。
- 期待される回答の要点: 2017-10-26公開。著者はTaichi Furuhashi。
- 参照すべきソースファイル: `distilled/01_lab_overview.md`、`distilled/08_timeline_index.md`、テーマ: 研究室概要
- 評価観点: タイトル、日付、著者をセットで答える。
- NG回答例: 「2018年に開始」「著者は不明」など、日付や著者を落とす。

### Q03
- 質問文: 「青学アドグル2022 始動！ DRONEBIRD隊員になろう。」の記事の公開日、著者、関連する活動名を答えてください。
- 期待される回答の要点: 2022-04-26公開。著者はTaichi Furuhashi。青学アドグル2022、DRONEBIRDに関する記事。
- 参照すべきソースファイル: `distilled/01_lab_overview.md`、テーマ: 研究室概要
- 評価観点: 記事名、日付、著者、活動名を正確に含める。
- NG回答例: 「ドローン部の一般記事」とだけ答え、青学アドグル2022やDRONEBIRDを省略する。

### Q04
- 質問文: `02_openstreetmap.md` に出てくる「Wheelmapというツール」は、いつ公開され、誰が書いた記事ですか。また概要では何のためのサービスと説明されていますか。
- 期待される回答の要点: 2018-11-30公開、著者はAyame.O。車椅子で目的地に行けるかを確かめ、その情報をOpenStreetMapに加える地図サービス。
- 参照すべきソースファイル: `distilled/02_openstreetmap.md`、テーマ: OpenStreetMap
- 評価観点: 日付、著者、Wheelmapの用途、OpenStreetMapとの関係を含める。
- NG回答例: 「一般的な地図アプリ」とだけ説明する。

### Q05
- 質問文: `05_gis_tools.md` にある「DRONEBIRDは災害時に何を行うのか！？」の記事の公開日と著者を答えてください。
- 期待される回答の要点: 2020-10-21公開。著者はHironori Morita。
- 参照すべきソースファイル: `distilled/05_gis_tools.md`、テーマ: GISツール・ドローン
- 評価観点: 日付と著者を正確に答える。
- NG回答例: 「Taichi Furuhashiの記事」と誤答する。

### Q06
- 質問文: `04_events.md` で、FOSS4G SHINSHU 2025への参加・登壇に関連している記事のタイトル、公開日、著者を答えてください。
- 期待される回答の要点: 「PLATEAUデータをマイクラのワールドデータにする裏技を見つけた！」、2025-12-05、Taichi Furuhashi。
- 参照すべきソースファイル: `distilled/04_events.md`、テーマ: イベント
- 評価観点: FOSS4G SHINSHU 2025と記事タイトルを結びつける。
- NG回答例: 「BUILD with Mapboxの記事」と混同する。

### Q07
- 質問文: 2026-05-18に公開されたツリーハウス・フィールドワーク関連の記事を、タイトルと著者付きで挙げてください。
- 期待される回答の要点: 「ツリーハウス、新たな土地開発へ⛰️」Miwa Yonekubo、「VF週報 ツリーハウス合宿での動画撮影」Himari Nonaka、「3日間のサバイバル生活⛺️」Himari Nonaka。
- 参照すべきソースファイル: `distilled/07_fieldwork.md`、`distilled/08_timeline_index.md`、テーマ: フィールドワーク
- 評価観点: 同日の該当記事を漏れなく、タイトル・著者付きで答える。
- NG回答例: 2025年のツリーハウス合宿記事を混ぜる。

### Q08
- 質問文: 「YouthMappersAGU × SWU w/ TomTom: Joint Mapathon①週報【2025/6/17】」の記事の公開日、著者、テーマを答えてください。
- 期待される回答の要点: 2025-06-17公開。著者はFuka Okamura。OpenStreetMap・YouthMappers・Mapathon関連。
- 参照すべきソースファイル: `distilled/02_openstreetmap.md`、`distilled/09_glossary.md`、テーマ: OpenStreetMap
- 評価観点: 記事タイトル、日付、著者、テーマを正確に結びつける。
- NG回答例: TomTomを著者名として扱う。

## 2. 時系列理解 5問

### Q09
- 質問文: `08_timeline_index.md` で確認できる最も古い記事と、2026年5月時点で最も新しい記事群の例を挙げてください。
- 期待される回答の要点: 最古の例は2017-10-26「Furuhashi Lab. was born in 2017」。2026年5月の新しい記事例として2026-05-19「2026 5 12 古橋研ゼミまとめ」「翻訳プロジェクト進捗報告...」「こんにちは。」など。
- 参照すべきソースファイル: `distilled/08_timeline_index.md`、テーマ: 時系列索引
- 評価観点: 古い記事と新しい記事を日付付きで区別する。
- NG回答例: 最新記事を2026-01-20だけとする。

### Q10
- 質問文: 2026-05-18に公開された記事は、どのような分類に分かれていますか。記事例も付けて答えてください。
- 期待される回答の要点: openstreetmap「【Youth①】Youth Mappers のホームページの理解を深める」、fieldwork「ツリーハウス、新たな土地開発へ⛰️」「VF週報 ツリーハウス合宿での動画撮影」「3日間のサバイバル生活⛺️」、lab_overview「古橋研ってジオ展だけでガチャガチャやるわけじゃないのよ‼！」、student_project「森ガールへの第一歩⛰️ 斜面開拓から始まるGW」、qgis_gis_tools「5/19ドローン部２週報...」。
- 参照すべきソースファイル: `distilled/08_timeline_index.md`、テーマ: 時系列索引
- 評価観点: 同日記事を分類ラベル別に整理する。
- NG回答例: 2026-05-18の記事をすべてfieldworkとする。

### Q11
- 質問文: BUILD with Mapbox 2025関連の記事は、どの順番で公開されていますか。公開日・タイトル・著者で答えてください。
- 期待される回答の要点: 2025-09-11「今年もBUILD with Mapboxの季節がやってきた！」Yukari Hayashi、2025-09-16「BUILD with Mapbox で技術の進化を“地図”で感じた週」Riko Sueki、2025-09-18「Build with Mapbox 2025に初参加しました！」Kouna Fukuda、2025-09-19「BUILD with Mapbox に今年も参加した 2025」KANAZAWA MAYU。
- 参照すべきソースファイル: `distilled/01_lab_overview.md`、`distilled/02_openstreetmap.md`、`distilled/04_events.md`、`distilled/09_glossary.md`、テーマ: イベント・地図技術
- 評価観点: 日付順で並べ、著者を省略しない。
- NG回答例: 2025-09-19だけを答える。

### Q12
- 質問文: ウクライナ支援に関するOSMマッピング記事は、2022年3月にどの順番で出ていますか。
- 期待される回答の要点: 2022-03-01「OSMマッピングによるウクライナ支援」Ibuki Shibayama、2022-03-08「ウクライナマッピング支援 3/8」SHIORI ONO。
- 参照すべきソースファイル: `distilled/02_openstreetmap.md`、`distilled/08_timeline_index.md`、テーマ: OpenStreetMap
- 評価観点: 日付順、タイトル、著者を正確に答える。
- NG回答例: 2025年のクライシスマッピング記事と混同する。

### Q13
- 質問文: ツリーハウス合宿・ツリーハウス関連の記事は、2019年、2024年、2025年、2026年にどのように現れていますか。各年から1例以上挙げてください。
- 期待される回答の要点: 2019-05-08「2019年初ゼミ合宿 inツリーハウス」、2024-06-01「自給自足サバイバル生活」、2025年は「ツリーハウス合宿」「ツリーハウス合宿に参加しました！」など、2026-05-18「ツリーハウス、新たな土地開発へ⛰️」など。
- 参照すべきソースファイル: `distilled/07_fieldwork.md`、テーマ: フィールドワーク
- 評価観点: 年ごとの記事例を日付付きで示す。
- NG回答例: 2025年だけを答える。

## 3. テーマ比較 5問

### Q14
- 質問文: `02_openstreetmap.md` と `05_gis_tools.md` の扱うテーマの違いを、記事例を使って説明してください。
- 期待される回答の要点: `02_openstreetmap.md` はOpenStreetMap、YouthMappers、Mapathon、OSM編集ツールなど。例: Wheelmap、JOSM、YouthMappersAGU。`05_gis_tools.md` はQGIS、GIS、ドローン、ODM、3Dモデル、DRONEBIRDなど技術実践。例: 「DRONEBIRDは災害時に何を行うのか！？」。
- 参照すべきソースファイル: `distilled/02_openstreetmap.md`、`distilled/05_gis_tools.md`、テーマ: テーマ比較
- 評価観点: 両テーマの違いを記事例で示す。
- NG回答例: どちらも単に「地図の記事」とだけ答える。

### Q15
- 質問文: `03_humanitarian_mapping.md` と `07_fieldwork.md` は、どちらも実践的活動を扱います。違いを記事例付きで説明してください。
- 期待される回答の要点: humanitarian_mappingは災害対応、人道支援、クライシスマッピングが中心。例: 「洪水が来てもマップは沈まない ― 2025アジアクライシスマッピング奮闘記」。fieldworkは現地調査、ツリーハウス合宿、地域での実地活動が中心。例: 「ツリーハウス合宿」「自給自足サバイバル生活」。
- 参照すべきソースファイル: `distilled/03_humanitarian_mapping.md`、`distilled/07_fieldwork.md`、テーマ: テーマ比較
- 評価観点: 災害・人道支援と現地調査・合宿の違いを明確にする。
- NG回答例: 両方を同じ「旅行記」として扱う。

### Q16
- 質問文: `04_events.md` と `01_lab_overview.md` の違いを、SotM 2025 Manila、FOSS4G SHINSHU 2025、UNITAR-UNVT Meetingの例を使って説明してください。
- 期待される回答の要点: `04_events.md` はイベント・発表・コミュニティ活動の整理で、FOSS4G SHINSHU 2025やBUILD with Mapboxなどが含まれる。`01_lab_overview.md` は研究室全体・運営・広報・活動紹介で、SotM 2025 ManilaやUNITAR-UNVT Meetingも研究室活動の文脈で出る。
- 参照すべきソースファイル: `distilled/01_lab_overview.md`、`distilled/04_events.md`、テーマ: イベント・研究室概要
- 評価観点: 同じ固有名詞でも、文書の目的が異なる点を説明する。
- NG回答例: `04_events.md` だけを参照し、研究室概要側を無視する。

### Q17
- 質問文: `06_student_projects.md` と `04_events.md` を比較し、学生の週報・卒論中間発表とイベント参加報告の違いを説明してください。
- 期待される回答の要点: student_projectsは学生プロジェクト、週報、卒業研究、チーム制作が中心。eventsはジオ展、FOSS4G、Mapbox、講演・ワークショップなど外部またはイベント単位の記録が中心。
- 参照すべきソースファイル: `distilled/06_student_projects.md`、`distilled/04_events.md`、テーマ: 学生プロジェクト・イベント
- 評価観点: 文書目的と記事タイプの違いを答える。
- NG回答例: 「どちらも学生の日記」とだけ答える。

### Q18
- 質問文: `08_timeline_index.md` と `09_glossary.md` は、NotebookLMでどのように使い分けるべきですか。
- 期待される回答の要点: `08_timeline_index.md` は公開日順に活動の流れを見るための索引。`09_glossary.md` はタグ・分類・関連キーワードから関連記事を探すための用語集。
- 参照すべきソースファイル: `distilled/08_timeline_index.md`、`distilled/09_glossary.md`、テーマ: 索引・用語集
- 評価観点: 時系列軸とキーワード軸の違いを説明する。
- NG回答例: 両方とも同じ一覧だと答える。

## 4. 初学者向け説明 5問

### Q19
- 質問文: 初学者に向けて、このソース群におけるOpenStreetMap関連活動を説明してください。必ず記事例を2つ挙げてください。
- 期待される回答の要点: OpenStreetMap関連活動は、OSM編集、YouthMappers、Mapathon、OSMツール紹介などを含む。例: 「Wheelmapというツール」「YouthMappersAGU × SWU w/ TomTom: Joint Mapathon①週報【2025/6/17】」など。
- 参照すべきソースファイル: `distilled/02_openstreetmap.md`、`distilled/09_glossary.md`、テーマ: OpenStreetMap
- 評価観点: 初学者向けに平易に説明しつつ、記事タイトル・日付・URLを示す。
- NG回答例: OSMの一般知識だけを説明し、ソース記事を挙げない。

### Q20
- 質問文: 初学者に向けて、Mapathonとはこのソース群でどのような文脈に出てくる活動か説明してください。
- 期待される回答の要点: MapathonはOpenStreetMap/YouthMappers/人道支援マッピング文脈で出る。例: Humanitarian Mapathon for the Southern Thailand Floods、Joint Mapathon、OSM 17th Birthday Celebration Mapathonなど。
- 参照すべきソースファイル: `distilled/02_openstreetmap.md`、`distilled/09_glossary.md`、テーマ: OpenStreetMap・用語集
- 評価観点: 記事例に基づき、推測で定義を拡張しない。
- NG回答例: 「地図を作る大会」とだけ答え、記事例を出さない。

### Q21
- 質問文: 初学者に向けて、DRONEBIRDがこの資料群でどのような活動として扱われているか説明してください。
- 期待される回答の要点: DRONEBIRDは災害時のドローン利活用やクライシスマッピング、ドローン関連活動と結びつく。記事例: 「青学アドグル2022 始動！ DRONEBIRD隊員になろう。」「DRONEBIRDは災害時に何を行うのか！？」。
- 参照すべきソースファイル: `distilled/01_lab_overview.md`、`distilled/05_gis_tools.md`、`distilled/09_glossary.md`、テーマ: DRONEBIRD
- 評価観点: ソース上の活動文脈に限定する。
- NG回答例: DRONEBIRDの外部情報を推測で詳述する。

### Q22
- 質問文: 初学者に向けて、FOSS4GやState of the Map関連の記事が、研究室の学習にどう使えるか説明してください。
- 期待される回答の要点: FOSS4GやState of the Mapはイベント・コミュニティ参加や地図・GIS技術学習の文脈で参照できる。例: FOSS4G SHINSHU 2025関連のPLATEAU記事、SotM 2025 Manila関連の記事。
- 参照すべきソースファイル: `distilled/04_events.md`、`distilled/01_lab_overview.md`、`distilled/02_openstreetmap.md`、テーマ: イベント・コミュニティ
- 評価観点: 具体記事と学習用途を結びつける。
- NG回答例: FOSS4Gの一般的説明だけで、古橋研究室記事に触れない。

### Q23
- 質問文: 初学者がNotebookLMで古橋研究室の記事群を調べるとき、`08_timeline_index.md` とテーマ別ファイルをどう使えばよいですか。
- 期待される回答の要点: まず時系列で日付・タイトル・著者・分類を確認し、詳細はテーマ別ファイルや元記事Markdownの概要・重要ポイントに戻る。日付不明や未記載情報は「不明」と扱う。
- 参照すべきソースファイル: `distilled/08_timeline_index.md`、各テーマ別ファイル、テーマ: NotebookLM利用法
- 評価観点: 検索手順をソース構造に沿って説明する。
- NG回答例: NotebookLMに任せればよい、とだけ答える。

## 5. 研究室活動の意義を問う問題 5問

### Q24
- 質問文: 「Furuhashi Lab. was born in 2017」に基づき、研究室が情報発信する意味を説明してください。
- 期待される回答の要点: 2017年に正式スタートした青山学院大学 地球社会共生学部 古橋研究室が、「一億総伊能化」を軸に活動や研究室の様子を情報発信する文脈がある。
- 参照すべきソースファイル: `distilled/01_lab_overview.md`、テーマ: 研究室概要
- 評価観点: ソースにある表現「2017年」「一億総伊能化」「情報発信」を落とさない。
- NG回答例: 研究室の理念を推測で別表現に置き換える。

### Q25
- 質問文: Open Mapping towards Sustainable Development Goals の翻訳プロジェクトは、研究室活動としてどのような意味を持つと整理できますか。
- 期待される回答の要点: オープンマッピングと地理空間情報を活用した社会課題解決、YouthMappersネットワークの歩み・学術的成果の日本語翻訳、Medium連載・GitHub特設サイト構築の文脈がある。
- 参照すべきソースファイル: `distilled/02_openstreetmap.md`、テーマ: OpenStreetMap・翻訳プロジェクト
- 評価観点: 記事にあるプロジェクト名、YouthMappers、Medium連載、GitHubを含める。
- NG回答例: SDGs一般論だけで答える。

### Q26
- 質問文: ツリーハウス合宿・千年の森自然学校関連の記事群は、研究室活動としてどのような意味を持つと整理できますか。
- 期待される回答の要点: フィールドワーク、現地調査、地域・自然環境での実地活動、合宿記録として整理される。例: 2019年初ゼミ合宿、2024年自給自足サバイバル生活、2025・2026年のツリーハウス合宿記事。
- 参照すべきソースファイル: `distilled/07_fieldwork.md`、テーマ: フィールドワーク
- 評価観点: 年代をまたぐ継続性と、フィールドワーク文脈を示す。
- NG回答例: 単なる旅行やレジャーとしてだけ説明する。

### Q27
- 質問文: ドローン、ODM、3Dモデル、DRONEBIRDなどの技術記事群は、研究室活動としてどのような意味を持つと整理できますか。
- 期待される回答の要点: GIS・ドローン・ODM・3Dモデル・DRONEBIRDなど、地理空間ツールの実践・検証・災害時利活用に関する活動として整理できる。
- 参照すべきソースファイル: `distilled/05_gis_tools.md`、`distilled/09_glossary.md`、テーマ: GISツール・ドローン
- 評価観点: 技術名と活動文脈をソースに沿って結びつける。
- NG回答例: 技術の性能評価をソース外の知識で断定する。

### Q28
- 質問文: イベント参加報告は、研究室の知識ソースとしてどのような意味がありますか。FOSS4G SHINSHU 2025、BUILD with Mapbox 2025、SotM 2025 Manilaのうち2つ以上を使って説明してください。
- 期待される回答の要点: 外部イベント・コミュニティ参加・登壇・技術学習の記録として、研究室活動の接点や学習成果を時系列に確認できる。例: FOSS4G SHINSHU 2025、BUILD with Mapbox 2025、SotM 2025 Manila。
- 参照すべきソースファイル: `distilled/04_events.md`、`distilled/01_lab_overview.md`、`distilled/02_openstreetmap.md`、テーマ: イベント
- 評価観点: 2つ以上のイベント名と記事例を含める。
- NG回答例: 「イベントは交流の場」だけで、ソース上のイベント名を出さない。

## 6. 引用・根拠確認 2問

### Q29
- 質問文: WheelmapとPLATEAU関連の記事について、根拠として使える元記事URLをそれぞれ1つずつ示し、記事タイトル・公開日・著者も併記してください。
- 期待される回答の要点: Wheelmap: 2018-11-30「Wheelmapというツール」Ayame.O、URLあり。PLATEAU: 2023-02-03「PLATEAU 建物データをOSMにインポートする際の事前準備」吉田航、または2025-12-05「PLATEAUデータをマイクラのワールドデータにする裏技を見つけた！」Taichi Furuhashi。
- 参照すべきソースファイル: `distilled/02_openstreetmap.md`、`distilled/04_events.md`、`distilled/09_glossary.md`、テーマ: 引用・根拠
- 評価観点: URL、タイトル、日付、著者を必ず併記する。
- NG回答例: URLだけ、またはタイトルだけで根拠として不十分な回答。

### Q30
- 質問文: 「2025アジアクライシスマッピング」と「DRONEBIRDは災害時に何を行うのか！？」を根拠付きで比較する場合、どのソースファイルと記事URLを参照すべきですか。
- 期待される回答の要点: 「洪水が来てもマップは沈まない ― 2025アジアクライシスマッピング奮闘記」は `distilled/03_humanitarian_mapping.md`、2025-12-03、Taichi Furuhashi、URLあり。「DRONEBIRDは災害時に何を行うのか！？」は `distilled/05_gis_tools.md`、2020-10-21、Hironori Morita、URLあり。
- 参照すべきソースファイル: `distilled/03_humanitarian_mapping.md`、`distilled/05_gis_tools.md`、テーマ: 引用・根拠
- 評価観点: 2つの記事を混同せず、各ソースファイル・日付・著者・URLを出す。
- NG回答例: 「どちらも災害関連なので同じ記事」とする。
