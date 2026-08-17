# Payment settings backend fix

The page allows customers to unlock settings by tapping Payment 6 times and entering `0107`. Changes are persisted in Netlify Blobs through `/.netlify/functions/settings`.

The Function must actually be deployed; a static drag-and-drop deployment is not sufficient for this backend.
