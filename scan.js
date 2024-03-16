document.getElementById("processButton").addEventListener("click", () => {
    // 獲取下拉式選單的值
    scanTarget = document.getElementById("scanTarget").value;
    addLocation = document.getElementById("addLocation").value;

    // 使用Chrome的chrome.bookmarks API掃描未分類書籤
    chrome.bookmarks.getTree(function (bookmarkTreeNodes) {
        bookmarkBarNodes = bookmarkTreeNodes[0]['children'];
        unclassifiedBookmarks = [];
        findUnclassifiedBookmarks(bookmarkBarNodes, scanTarget, unclassifiedBookmarks);

        if (unclassifiedBookmarks) {
            unclassifiedBookmarks = JSON.stringify(unclassifiedBookmarks);
            callAI(unclassifiedBookmarks, setupBookmarks, addLocation);
        } else {
            console.error('未找到 "書籤列" 文件夾');
        }
    });
});

function findUnclassifiedBookmarks(bookmarkNodes, scanTarget, unclassifiedBookmarks) {
    if (scanTarget === "all") {
      // 遍歷所有書籤
      bookmarkNodes.forEach(function (node) {
        if (node.children) {
          findUnclassifiedBookmarks(node.children, scanTarget, unclassifiedBookmarks);
        } else {
          // 將未分類書籤加入 unclassifiedBookmarks 陣列
          unclassifiedBookmarks.push({
            title: node.title,
            url: node.url
          });
        }
      });
    } else if (scanTarget === "uncategorized") {
      // 遍歷所有書籤
      bookmarkNodes.forEach(function (node) {
        if (node.children) {
          findUnclassifiedBookmarks(node.children, scanTarget, unclassifiedBookmarks);
        } else {
          // 檢查書籤是否未分類（層級為 1）
          if (node.parentId === "1") {
            // 將未分類書籤加入 unclassifiedBookmarks 陣列
            unclassifiedBookmarks.push({
              title: node.title,
              url: node.url
            });
          }
        }
      });
    }
    return unclassifiedBookmarks;
  }

function callAI(unclassifiedBookmarks, setupBookmarks, addLocation) {
    const API_KEY = "api_key"; // 記得替換為你的實際OpenAI API金鑰
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

    const data = {
    contents: [
        {
        parts: [
            {
                text: '請把書籤名稱有相似的書籤分為同一類書籤底下，例如:《天命奇御》、《天命奇御2》會被分類到天命奇御底下。\
                輸出格式:\
                {"roots": [\
                    {"category":"天命奇御","bookmarks": [{"title": "...", "url": "..."},[{"title": "...", "url": "..."}]},\
                    {"category":"...","bookmarks": [{"title": "...", "url": "..."},[{"title": "...", "url": "..."}]},\
                ]}\
                以下是所有書籤:'+unclassifiedBookmarks
            }
        ]
        }
    ]
    };

    fetch(url + '?key=' + API_KEY, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        // 在這裡處理API回應
        console.log(result['candidates'][0]['content']['parts'][0]['text']);
        classifiedBookmarks = JSON.parse(result['candidates'][0]['content']['parts'][0]['text']);
        setupBookmarks(classifiedBookmarks, addLocation);
    })
    .catch(error => {
        // 在這裡處理錯誤
        console.error('Error:', error);
    });

}

function setupBookmarks(classifiedBookmarks, bookmarkBarId) {
    // 將分類好的書籤加入 Chrome 書籤管理中
    classifiedBookmarks.roots.forEach(root => {
        const category = root.category;
        const bookmarks = root.bookmarks;

        chrome.bookmarks.create({ title: category, parentId: bookmarkBarId }, folder => {
            bookmarks.forEach(bookmark => {
                chrome.bookmarks.create({
                    parentId: folder.id,
                    title: bookmark.title,
                    url: bookmark.url
                });
            });
        });
    });
}

