export const useFavorites = () => {
  const { $awn } = useNuxtApp();
  const { locale } = useI18n();
  const {
    public: { api, apiBase },
  } = useRuntimeConfig();

  // Global state - shared across all components
  const globalState = useState("favorites-global", () => ({
    favorites: new Set(),
    loading: false,
    initializing: false,
    loadingStates: {},
    abortControllers: {},
    initialized: false, // Add this flag
  }));

  // Helper functions
  const getAuthHeaders = () => ({
    Authorization: `Bearer ${useMainToken().value}`,
  });

  const showNotification = (success, action) => {
    // ... your existing notification code
  };

  // Initialize favorites - only once globally
  const initFavorites = async () => {
    if (!useAuth().value.isAuthenticated || globalState.value.initialized) {
      return;
    }

    // Cancel any pending initialization
    if (globalState.value.abortControllers.init) {
      globalState.value.abortControllers.init.abort();
    }
    globalState.value.abortControllers.init = new AbortController();

    globalState.value.loading = true;
    globalState.value.initializing = true;

    try {
      const { data } = await useFetch(
        `${api.GetAllFav}/${useUserInfo().value.clientId}`,
        {
          baseURL: apiBase,
          headers: getAuthHeaders(),
          signal: globalState.value.abortControllers.init.signal,
        }
      );

      if (data.value?.data) {
        globalState.value.favorites = new Set(
          data.value.data.map((item) => item.productId)
        );
        globalState.value.initialized = true; // Mark as initialized
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Failed to fetch favorites:", error);
      }
    } finally {
      globalState.value.loading = false;
      globalState.value.initializing = false;
      delete globalState.value.abortControllers.init;
    }
  };

  // Check if product is in favorites
  const isFavorite = (productId) => globalState.value.favorites.has(productId);

  // Add to favorites
  const addToFavorites = async (productId) => {
    if (!useAuth().value.isAuthenticated) {
      showNotification(false, "auth");
      return false;
    }

    if (globalState.value.loading || isFavorite(productId)) return false;

    // Cancel any pending add request for this product
    if (globalState.value.abortControllers[`add_${productId}`]) {
      globalState.value.abortControllers[`add_${productId}`].abort();
    }
    globalState.value.abortControllers[`add_${productId}`] =
      new AbortController();

    globalState.value.loadingStates[productId] = true;

    try {
      const { data } = await useFetch(`${api.AddToFav}`, {
        baseURL: apiBase,
        method: "POST",
        body: {
          productId,
          clientId: useUserInfo().value.clientId,
        },
        headers: getAuthHeaders(),
        signal: globalState.value.abortControllers[`add_${productId}`].signal,
      });

      if (data.value?.succeeded) {
        globalState.value.favorites.add(productId);
        showNotification(true, "add");
        return true;
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Failed to add favorite:", error);
        showNotification(false, "add");
      }
    } finally {
      globalState.value.loadingStates[productId] = false;
      delete globalState.value.abortControllers[`add_${productId}`];
    }
    return false;
  };

  // Remove from favorites
  const removeFromFavorites = async (productId) => {
    if (!useAuth().value.isAuthenticated || !isFavorite(productId))
      return false;

    // Cancel any pending remove request for this product
    if (globalState.value.abortControllers[`remove_${productId}`]) {
      globalState.value.abortControllers[`remove_${productId}`].abort();
    }
    globalState.value.abortControllers[`remove_${productId}`] =
      new AbortController();

    globalState.value.loadingStates[productId] = true;

    try {
      const { data } = await useFetch(
        `${api.AdvancedRenoveFromFav}/${
          useUserInfo().value.clientId
        }/${productId}`,
        {
          baseURL: apiBase,
          method: "DELETE",
          headers: getAuthHeaders(),
          signal:
            globalState.value.abortControllers[`remove_${productId}`].signal,
        }
      );

      if (data.value?.succeeded) {
        globalState.value.favorites.delete(productId);
        showNotification(true, "remove");
        return true;
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Failed to remove favorite:", error);
        showNotification(false, "remove");
      }
    } finally {
      globalState.value.loadingStates[productId] = false;
      delete globalState.value.abortControllers[`remove_${productId}`];
    }
    return false;
  };

  // Toggle favorite status
  const toggleFavorite = async (productId) => {
    if (globalState.value.loadingStates[productId]) return;

    try {
      if (isFavorite(productId)) {
        await removeFromFavorites(productId);
      } else {
        await addToFavorites(productId);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  // Get loading state for a specific product
  const isLoading = (productId) => !!globalState.value.loadingStates[productId];

  return {
    favorites: computed(() => Array.from(globalState.value.favorites)),
    loading: computed(() => globalState.value.loading),
    initializing: computed(() => globalState.value.initializing),
    initFavorites,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isLoading,
  };
};
