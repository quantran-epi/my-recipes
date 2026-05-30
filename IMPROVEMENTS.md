# App Improvement Suggestions

## 🔴 UX / Functional

1. **Dish completion quick toggle**  
   `isCompleted` flag exists but requires opening the edit modal to change. Add a quick checkmark button directly on the list item to toggle done/undone inline.

2. **Shopping list inline check-off**  
   When checking off ingredients while shopping, allow a checkbox inline on each ingredient row instead of opening the detail modal.

3. **Dish image broken URL fallback**  
   If a URL image fails to load (broken link), show the placeholder icon instead of a broken image element. Use the `onError` handler on `<Avatar>`.

4. **Scroll-to-top on search reset**  
   When the user clears the search input, smooth scroll back to the top of the list so the reset feels intentional.

---

## 🟡 Data / Features

5. **Undo delete**  
   Instead of permanently deleting immediately, show a brief "Hoàn tác" snackbar for ~5 seconds before actually dispatching `removeDishes`. Prevents accidental data loss.

6. **Dish tags / categories**  
   Allow dishes to be tagged (e.g. Canh, Món chính, Tráng miệng…) with a filter chip bar at the top of the list for quick filtering.

7. **Shopping list ingredient grouping**  
   In the shopping list detail, group ingredients by category (Thịt, Rau củ, Gia vị…) to make physical shopping easier.

8. **Duplicate dish**  
   Add a "Nhân bản" option in the dish dropdown menu. Useful when two dishes are similar and only differ slightly.

---

## 🟢 Performance / Technical

9. **True list virtualization**  
   The current IntersectionObserver + slice approach still keeps all previous items mounted in the DOM. For very large lists, consider `react-window` or `react-virtual` for true DOM virtualization.

10. **Image compression before storage**  
    Base64 images from device upload are stored raw in Redux/localStorage and can be very large (1–5 MB each). Compress using a canvas resize to a max dimension (e.g. 800px) before storing.

11. **Backup conflict detection**  
    Before pushing to GitHub, compare the `last_modified` timestamp of the remote `data.txt` with the local last backup time. Warn the user if the remote is newer (e.g. edited on another device).

12. **PWA full offline support**  
    The service worker is already scaffolded (`serviceWorkerRegistration.ts`). Enable it so the app works fully offline, with backup syncing queued until connection is restored.
