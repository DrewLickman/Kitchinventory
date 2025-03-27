<script>
	import { onMount } from "svelte";

	// Mock data
	let inventoryItems = [
		{
			id: 1,
			name: "Milk",
			quantity: "1 gallon",
			location: "Main Fridge",
			expiry: "2025-04-01",
			category: "Dairy",
			image: "https://via.placeholder.com/50",
			percentRemaining: 80,
			brand: "Organic Valley",
			price: 4.99,
		},
		{
			id: 2,
			name: "Eggs",
			quantity: "10 count",
			location: "Main Fridge",
			expiry: "2025-04-13",
			category: "Dairy",
			image: "https://via.placeholder.com/50",
			percentRemaining: 90,
			brand: "Farm Fresh",
			price: 3.49,
		},
		{
			id: 3,
			name: "Spinach",
			quantity: "1 bag",
			location: "Main Fridge",
			expiry: "2025-03-30",
			category: "Produce",
			image: "https://via.placeholder.com/50",
			percentRemaining: 60,
			brand: "Green Farms",
			price: 2.99,
		},
		{
			id: 4,
			name: "Chicken Breast",
			quantity: "2 lbs",
			location: "Freezer",
			expiry: "2025-06-15",
			category: "Meat",
			image: "https://via.placeholder.com/50",
			percentRemaining: 100,
			brand: "Valley Farms",
			price: 9.99,
		},
		{
			id: 5,
			name: "Rice",
			quantity: "2 lbs",
			location: "Pantry",
			expiry: "2025-12-31",
			category: "Grains",
			image: "https://via.placeholder.com/50",
			percentRemaining: 45,
			brand: "Jasmine Fields",
			price: 3.29,
		},
	];

	const recipeItems = [
		{
			id: 1,
			name: "Spinach and Egg Breakfast Bowl",
			ingredients: [
				{
					name: "Eggs",
					amount: "2",
					required: true,
					inInventory: true,
				},
				{
					name: "Spinach",
					amount: "1 cup",
					required: true,
					inInventory: true,
				},
				{
					name: "Onions",
					amount: "1/4 cup",
					required: false,
					inInventory: false,
				},
				{
					name: "Salt",
					amount: "to taste",
					required: false,
					inInventory: true,
				},
				{
					name: "Pepper",
					amount: "to taste",
					required: false,
					inInventory: true,
				},
			],
			image: "https://via.placeholder.com/150",
			cookTime: "15 min",
			matchPercentage: 100,
			instructions: [
				"Heat a non-stick pan over medium heat",
				"Add chopped onions and sauté until translucent",
				"Add spinach and cook until wilted",
				"Crack eggs directly into the pan and scramble with the vegetables",
				"Season with salt and pepper to taste",
				"Serve hot in a bowl",
			],
			difficulty: "Easy",
			servings: 1,
			calories: 220,
		},
		{
			id: 2,
			name: "Chicken and Rice Bowl",
			ingredients: [
				{
					name: "Chicken Breast",
					amount: "6 oz",
					required: true,
					inInventory: true,
				},
				{
					name: "Rice",
					amount: "1 cup cooked",
					required: true,
					inInventory: true,
				},
				{
					name: "Tomatoes",
					amount: "1/2 cup diced",
					required: true,
					inInventory: false,
				},
				{
					name: "Olive Oil",
					amount: "1 tbsp",
					required: false,
					inInventory: false,
				},
				{
					name: "Garlic",
					amount: "2 cloves",
					required: false,
					inInventory: false,
				},
				{
					name: "Salt",
					amount: "to taste",
					required: false,
					inInventory: true,
				},
				{
					name: "Pepper",
					amount: "to taste",
					required: false,
					inInventory: true,
				},
			],
			image: "https://via.placeholder.com/150",
			cookTime: "25 min",
			matchPercentage: 85,
			instructions: [
				"Season chicken with salt and pepper",
				"Heat olive oil in a pan over medium-high heat",
				"Cook chicken until internal temperature reaches 165°F",
				"Let chicken rest for 5 minutes, then dice",
				"Combine cooked rice, diced chicken, and tomatoes in a bowl",
				"Season with additional salt and pepper if needed",
			],
			difficulty: "Medium",
			servings: 2,
			calories: 450,
		},
	];

	let shoppingList = [
		{
			id: 1,
			name: "Butter",
			category: "Dairy",
			automatic: true,
			reason: "Low stock",
			checked: false,
		},
		{
			id: 2,
			name: "Bread",
			category: "Bakery",
			automatic: true,
			reason: "Out of stock",
			checked: false,
		},
		{
			id: 3,
			name: "Apples",
			category: "Produce",
			automatic: false,
			reason: "Manually added",
			checked: true,
		},
		{
			id: 4,
			name: "Olive Oil",
			category: "Pantry",
			automatic: true,
			reason: "Low stock",
			checked: false,
		},
	];

	const categories = [
		"Dairy",
		"Produce",
		"Meat",
		"Grains",
		"Pantry",
		"Beverages",
		"Frozen",
		"Snacks",
	];

	const locations = ["Main Fridge", "Freezer", "Pantry"];

	const quantityTypes = [
		"count",
		"oz",
		"lbs",
		"g",
		"kg",
		"ml",
		"L",
		"cup",
		"tbsp",
		"tsp",
		"gallon",
		"quart",
		"pint",
		"bunch",
		"package",
		"bag",
		"box",
		"can",
		"bottle",
	];

	// State variables
	let activeTab = "inventory";
	let selectedLocation = "All Locations";
	let selectedCategory = "All Categories";
	let sortBy = "expiryDate";
	let sortOrder = "asc";
	let searchQuery = "";
	let isAddItemModalOpen = false;
	let isDetailModalOpen = false;
	let isRecipeDetailOpen = false;
	let isFoodLogModalOpen = false;
	let selectedItem = null;
	let selectedRecipe = null;
	let filteredItems = [];
	let adjustAmount = 1;
	let notification = null; // For showing temporary notifications

	const foodLog = [
		{
			id: 1,
			name: "Breakfast Bowl",
			amount: "1 serving",
			calories: 320,
			time: "7:30 AM",
		},
		{
			id: 2,
			name: "Coffee with Milk",
			amount: "12 oz",
			calories: 85,
			time: "7:45 AM",
		},
		{
			id: 3,
			name: "Chicken Salad",
			amount: "1 bowl",
			calories: 410,
			time: "12:15 PM",
		},
		{
			id: 4,
			name: "Apple",
			amount: "1 medium",
			calories: 95,
			time: "3:30 PM",
		},
	];

	// New item form
	let newItem = {
		name: "",
		category: "Dairy",
		location: "Main Fridge",
		quantityAmount: 1,
		quantityType: "count",
		brand: "",
		price: "",
		expiry: new Date().toISOString().split("T")[0],
		percentRemaining: 100,
	};
	let formErrors = {};

	// Shopping list state
	let newShoppingItem = "";

	// Function to toggle a shopping item's checked state
	function toggleShoppingItemChecked(id) {
		shoppingList = shoppingList.map((item) => {
			if (item.id === id) {
				return { ...item, checked: !item.checked };
			}
			return item;
		});
	}

	// Functions
	function setActiveTab(tab) {
		activeTab = tab;
	}

	function filterInventory() {
		// Start with all items
		let result = [...inventoryItems];

		// Filter by location
		if (selectedLocation !== "All Locations") {
			result = result.filter(
				(item) => item.location === selectedLocation,
			);
		}

		// Filter by category
		if (selectedCategory !== "All Categories") {
			result = result.filter(
				(item) => item.category === selectedCategory,
			);
		}

		// Filter by search
		if (searchQuery.trim() !== "") {
			result = result.filter(
				(item) =>
					item.name
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					item.category
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					(item.brand &&
						item.brand
							.toLowerCase()
							.includes(searchQuery.toLowerCase())),
			);
		}

		// Sort items
		if (sortBy === "name") {
			result.sort((a, b) =>
				sortOrder === "asc"
					? a.name.localeCompare(b.name)
					: b.name.localeCompare(a.name),
			);
		} else if (sortBy === "expiryDate") {
			result.sort((a, b) => {
				const dateA = new Date(a.expiry);
				const dateB = new Date(b.expiry);
				return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
			});
		} else if (sortBy === "percentRemaining") {
			result.sort((a, b) =>
				sortOrder === "asc"
					? a.percentRemaining - b.percentRemaining
					: b.percentRemaining - a.percentRemaining,
			);
		}

		filteredItems = result;
	}

	function toggleAddItemModal() {
		isAddItemModalOpen = !isAddItemModalOpen;
		if (!isAddItemModalOpen) {
			// Reset form when closing
			resetNewItemForm();
		}
	}

	function toggleDetailModal(item = null) {
		selectedItem = item;
		isDetailModalOpen = !isDetailModalOpen;
	}

	function toggleRecipeDetail(recipe = null) {
		selectedRecipe = recipe;
		isRecipeDetailOpen = !isRecipeDetailOpen;
	}

	function toggleFoodLogModal() {
		isFoodLogModalOpen = !isFoodLogModalOpen;
	}

	function calculateDaysUntilExpiry(expiryDate) {
		const expiry = new Date(expiryDate);
		const today = new Date();
		const diffTime = expiry - today;
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	}

	function getExpiryStatusClass(expiryDate) {
		const daysLeft = calculateDaysUntilExpiry(expiryDate);
		if (daysLeft < 0) return "expired";
		if (daysLeft <= 3) return "expiring-soon";
		return "valid";
	}

	function formatCurrency(amount) {
		return `$${Number(amount).toFixed(2)}`;
	}

	function validateNewItemForm() {
		const errors = {};

		if (!newItem.name.trim()) {
			errors.name = "Name is required";
		}

		if (
			!newItem.quantityAmount ||
			isNaN(newItem.quantityAmount) ||
			newItem.quantityAmount <= 0
		) {
			errors.quantity = "Valid quantity amount is required";
		}

		if (!newItem.expiry) {
			errors.expiry = "Expiry date is required";
		}

		if (newItem.price && isNaN(Number(newItem.price))) {
			errors.price = "Price must be a valid number";
		}

		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	function addNewItem() {
		if (!validateNewItemForm()) {
			return;
		}

		const newId = Math.max(...inventoryItems.map((item) => item.id), 0) + 1;

		// Format the quantity string
		const formattedQuantity = `${newItem.quantityAmount} ${newItem.quantityType}`;

		const itemToAdd = {
			...newItem,
			id: newId,
			quantity: formattedQuantity,
			price: newItem.price ? Number(newItem.price) : 0,
			image: "https://via.placeholder.com/50",
		};

		// Remove the separate quantity fields before adding to inventory
		delete itemToAdd.quantityAmount;
		delete itemToAdd.quantityType;

		inventoryItems.push(itemToAdd);
		inventoryItems = inventoryItems; // Trigger reactivity

		toggleAddItemModal();
		filterInventory();

		showNotification(`${itemToAdd.name} added to your inventory`);
	}

	function resetNewItemForm() {
		newItem = {
			name: "",
			category: "Dairy",
			location: "Main Fridge",
			quantityAmount: 1,
			quantityType: "count",
			brand: "",
			price: "",
			expiry: new Date().toISOString().split("T")[0],
			percentRemaining: 100,
		};
		formErrors = {};
	}

	function addToShoppingList() {
		if (!newShoppingItem.trim()) {
			showNotification("Please enter an item name", "error");
			return;
		}

		const newId = Math.max(...shoppingList.map((item) => item.id), 0) + 1;

		const itemToAdd = {
			id: newId,
			name: newShoppingItem,
			category: "Other",
			automatic: false,
			reason: "Manually added",
			checked: false,
		};

		shoppingList.push(itemToAdd);
		shoppingList = shoppingList; // Trigger reactivity
		showNotification(`${newShoppingItem} added to your shopping list`);

		// Reset input
		newShoppingItem = "";
	}

	function adjustItemQuantity(item, amount, action) {
		if (!amount || isNaN(amount) || amount <= 0) {
			showNotification("Please enter a valid quantity amount", "error");
			return;
		}

		// Find the item in the inventory
		const index = inventoryItems.findIndex((i) => i.id === item.id);

		if (index !== -1) {
			// Calculate new percentage
			let newPercentage;
			const oldPercentage = inventoryItems[index].percentRemaining;

			if (action === "add") {
				// Add - can't go above 100%
				newPercentage = Math.min(100, oldPercentage + Number(amount));

				if (newPercentage === 100 && oldPercentage < 100) {
					showNotification(
						`Added ${amount}% to ${item.name}. Item is now full.`,
					);
				} else if (newPercentage === oldPercentage) {
					showNotification(`${item.name} is already full!`, "info");
				} else {
					showNotification(`Added ${amount}% to ${item.name}`);
				}
			} else {
				// Remove - can't go below 0%
				newPercentage = Math.max(0, oldPercentage - Number(amount));

				if (newPercentage === 0 && oldPercentage > 0) {
					showNotification(
						`Used ${amount}% of ${item.name}. Item is now empty!`,
						"warning",
					);
				} else if (newPercentage === oldPercentage) {
					showNotification(`${item.name} is already empty!`, "info");
				} else {
					showNotification(`Used ${amount}% of ${item.name}`);
				}
			}

			// Update the item
			inventoryItems[index] = {
				...inventoryItems[index],
				percentRemaining: newPercentage,
			};

			// If percentage is low, add to shopping list automatically
			if (
				newPercentage <= 20 &&
				!shoppingList.some((i) => i.name === item.name)
			) {
				const newId =
					Math.max(...shoppingList.map((item) => item.id), 0) + 1;

				shoppingList.push({
					id: newId,
					name: item.name,
					category: item.category,
					automatic: true,
					reason: "Low stock",
					checked: false,
				});

				shoppingList = shoppingList; // Trigger reactivity
				showNotification(
					`${item.name} added to shopping list automatically`,
					"info",
				);
			}

			// Trigger reactivity
			inventoryItems = inventoryItems;
			filterInventory();
		}
	}

	onMount(() => {
		filterInventory();
	});

	// Filter recipe items based on search query
	function filterRecipes() {
		if (!searchQuery.trim()) {
			return recipeItems;
		}

		return recipeItems.filter(
			(recipe) =>
				recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				recipe.ingredients.some((ing) =>
					ing.name.toLowerCase().includes(searchQuery.toLowerCase()),
				),
		);
	}

	// Filter shopping list based on search query
	function filterShoppingList() {
		if (!searchQuery.trim()) {
			return shoppingList;
		}

		return shoppingList.filter(
			(item) =>
				item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.category.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	}

	// Filter food log based on search query
	function filterFoodLog() {
		if (!searchQuery.trim()) {
			return foodLog;
		}

		return foodLog.filter((item) =>
			item.name.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	}

	// Make filter functions react to search query changes
	$: {
		if (searchQuery) {
			filterInventory();
			filteredRecipes = filterRecipes();
			filteredShoppingList = filterShoppingList();
			filteredFoodLog = filterFoodLog();
		}
	}

	// Reactive declarations for filtered data
	$: filteredRecipes = filterRecipes();
	$: filteredShoppingList = filterShoppingList();
	$: filteredFoodLog = filterFoodLog();

	$: {
		filterInventory();
	}

	// Check if we have automatic items
	$: hasAutomaticItems = shoppingList.some((item) => item.automatic);

	// Function to sort shopping list
	function sortShoppingList(by) {
		if (by === "category") {
			shoppingList = shoppingList.sort((a, b) =>
				a.category.localeCompare(b.category),
			);
		} else if (by === "name") {
			shoppingList = shoppingList.sort((a, b) =>
				a.name.localeCompare(b.name),
			);
		}
	}

	// Function to clear checked items
	function clearCheckedItems() {
		shoppingList = shoppingList.filter((item) => !item.checked);
	}

	// Function to refresh automatic items based on current inventory
	function refreshAutomaticItems() {
		// First, remove all automatic items
		shoppingList = shoppingList.filter((item) => !item.automatic);

		// Then check inventory for low items and add them automatically
		for (const item of inventoryItems) {
			if (
				item.percentRemaining <= 20 &&
				!shoppingList.some((i) => i.name === item.name)
			) {
				const newId =
					Math.max(...shoppingList.map((item) => item.id || 0), 0) +
					1;

				shoppingList.push({
					id: newId,
					name: item.name,
					category: item.category,
					automatic: true,
					reason: "Low stock",
					checked: false,
				});
			}
		}

		// Trigger reactivity
		shoppingList = shoppingList;
	}

	// Function to delete a shopping item
	function deleteShoppingItem(id) {
		shoppingList = shoppingList.filter((item) => item.id !== id);
	}

	// Function to show a temporary notification
	function showNotification(message, type = "success") {
		notification = { message, type };

		// Auto-remove the notification after 3 seconds
		setTimeout(() => {
			notification = null;
		}, 3000);
	}
</script>

<div class="app">
	<!-- Notification -->
	{#if notification}
		<div class="notification-container">
			<div class="notification {notification.type}">
				<span class="notification-message">{notification.message}</span>
				<button
					class="notification-close"
					on:click={() => (notification = null)}
				>
					<i class="fas fa-times"></i>
				</button>
			</div>
		</div>
	{/if}
	<!-- Header -->
	<header class="header">
		<div class="logo">
			<i class="fas fa-utensils"></i>
			<h1>Kitchinventory</h1>
		</div>
		<div class="header-actions">
			<div class="search-container">
				<input
					type="text"
					bind:value={searchQuery}
					on:input={() => {
						filterInventory();
						filteredRecipes = filterRecipes();
						filteredShoppingList = filterShoppingList();
						filteredFoodLog = filterFoodLog();
					}}
					placeholder="Search..."
					class="search-input"
				/>
				<i class="fas fa-search search-icon"></i>
			</div>
			<button class="icon-button">
				<i class="fas fa-bell"></i>
			</button>
			<button class="icon-button">
				<i class="fas fa-user"></i>
			</button>
		</div>
	</header>

	<!-- Navigation -->
	<nav class="main-nav">
		<button
			class="nav-button {activeTab === 'inventory' ? 'active' : ''}"
			on:click={() => setActiveTab("inventory")}
		>
			<i class="fas fa-box-open"></i> Inventory
		</button>
		<button
			class="nav-button {activeTab === 'recipes' ? 'active' : ''}"
			on:click={() => setActiveTab("recipes")}
		>
			<i class="fas fa-utensils"></i> Recipes
		</button>
		<button
			class="nav-button {activeTab === 'shopping' ? 'active' : ''}"
			on:click={() => setActiveTab("shopping")}
		>
			<i class="fas fa-shopping-cart"></i> Shopping
		</button>
		<button
			class="nav-button {activeTab === 'nutrition' ? 'active' : ''}"
			on:click={() => setActiveTab("nutrition")}
		>
			<i class="fas fa-chart-pie"></i> Nutrition
		</button>
	</nav>

	<!-- Main Content -->
	<main class="main-content">
		<!-- Inventory Tab -->
		{#if activeTab === "inventory"}
			<section class="fade-in">
				<div class="section-header">
					<h2>My Inventory</h2>
					<div class="filters">
						<div class="select-container">
							<select
								bind:value={selectedLocation}
								on:change={filterInventory}
							>
								<option>All Locations</option>
								{#each locations as location}
									<option>{location}</option>
								{/each}
							</select>
						</div>

						<div class="select-container">
							<select
								bind:value={selectedCategory}
								on:change={filterInventory}
							>
								<option>All Categories</option>
								{#each categories as category}
									<option>{category}</option>
								{/each}
							</select>
						</div>

						<div class="select-container">
							<select
								bind:value={sortBy}
								on:change={filterInventory}
							>
								<option value="expiryDate"
									>Sort by Expiry</option
								>
								<option value="name">Sort by Name</option>
								<option value="percentRemaining"
									>Sort by Remaining</option
								>
							</select>
						</div>

						<button
							class="icon-button"
							on:click={() => {
								sortOrder =
									sortOrder === "asc" ? "desc" : "asc";
								filterInventory();
							}}
						>
							<i
								class="fas fa-{sortOrder === 'asc'
									? 'sort-amount-down-alt'
									: 'sort-amount-up-alt'}"
							></i>
						</button>

						<button
							class="add-button"
							on:click={toggleAddItemModal}
						>
							<i class="fas fa-plus"></i> Add Item
						</button>
					</div>
				</div>

				{#if filteredItems.length === 0}
					<div class="empty-state">
						<i class="fas fa-box-open empty-icon"></i>
						<p>No items found.</p>
						<button
							class="add-button"
							on:click={toggleAddItemModal}
						>
							<i class="fas fa-plus"></i> Add Item
						</button>
					</div>
				{:else}
					<div class="inventory-grid">
						{#each filteredItems as item}
							<div
								class="inventory-item"
								on:click={() => toggleDetailModal(item)}
							>
								<div class="item-content">
									<div class="item-image">
										<img src={item.image} alt={item.name} />
									</div>
									<div class="item-details">
										<div class="item-header">
											<h3>{item.name}</h3>
											<span class="location-tag"
												>{item.location}</span
											>
										</div>
										<p class="item-quantity">
											{item.quantity}
										</p>
										<div class="progress-container">
											<div
												class="progress-bar {item.percentRemaining <=
												20
													? 'low'
													: item.percentRemaining <=
														  50
														? 'medium'
														: 'high'}"
												style="width: {item.percentRemaining}%"
											></div>
										</div>
										<div class="item-meta">
											<span
												>{item.percentRemaining}%
												Remaining</span
											>
											<span
												class="expiry-date {getExpiryStatusClass(
													item.expiry,
												)}"
											>
												{calculateDaysUntilExpiry(
													item.expiry,
												) > 0
													? `Expires in ${calculateDaysUntilExpiry(item.expiry)} days`
													: "Expired!"}
											</span>
										</div>
									</div>
								</div>
								<div class="item-actions">
									<span class="price-tag"
										>{formatCurrency(item.price)}</span
									>
									<div>
										<button
											class="action-button"
											on:click={(e) => {
												e.stopPropagation();
												// Handle edit (not implemented)
											}}
										>
											<i class="fas fa-pencil-alt"></i> Edit
										</button>
										<div class="quantity-adjuster">
											<input
												type="number"
												class="quantity-input"
												placeholder="Amount"
												min="1"
												max="100"
												bind:value={adjustAmount}
												on:click={(e) =>
													e.stopPropagation()}
											/>
											<div class="quantity-buttons">
												<button
													class="action-button add"
													on:click={(e) => {
														e.stopPropagation();
														adjustItemQuantity(
															item,
															adjustAmount,
															"add",
														);
													}}
												>
													<i
														class="fas fa-plus-circle"
													></i> Add
												</button>
												<button
													class="action-button remove"
													on:click={(e) => {
														e.stopPropagation();
														adjustItemQuantity(
															item,
															adjustAmount,
															"remove",
														);
													}}
												>
													<i
														class="fas fa-minus-circle"
													></i> Use
												</button>
											</div>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/if}

		<!-- Recipes Tab -->
		{#if activeTab === "recipes"}
			<section class="fade-in">
				<div class="section-header">
					<h2>Recipe Suggestions</h2>
					<div class="filters">
						<div class="select-container">
							<select>
								<option>All Recipes</option>
								<option>Quick Meals (&lt 30 min)</option>
								<option>Matches Inventory</option>
								<option>Favorites</option>
							</select>
						</div>
					</div>
				</div>

				<div class="recipe-grid">
					{#each filteredRecipes as recipe}
						<div
							class="recipe-card"
							on:click={() => toggleRecipeDetail(recipe)}
						>
							<div class="recipe-image">
								<img src={recipe.image} alt={recipe.name} />
								<span class="match-badge">
									{recipe.matchPercentage}% Match
								</span>
							</div>
							<div class="recipe-content">
								<h3>{recipe.name}</h3>
								<div class="recipe-meta">
									{#if recipe.cookTime}
										<span
											><i class="far fa-clock"></i>
											{recipe.cookTime}</span
										>
									{/if}
									{#if recipe.difficulty}
										<span
											><i class="fas fa-utensils"></i>
											{recipe.difficulty}</span
										>
									{/if}
									{#if recipe.calories}
										<span
											><i class="fas fa-fire"></i>
											{recipe.calories} cal</span
										>
									{/if}
								</div>
								<div class="recipe-ingredients">
									<p>Main Ingredients:</p>
									<div class="ingredient-tags">
										{#each recipe.ingredients
											.filter((i) => i.required)
											.slice(0, 3) as ingredient}
											<span
												class="ingredient-tag {ingredient.inInventory
													? 'available'
													: 'missing'}"
											>
												{ingredient.name}
											</span>
										{/each}
										{#if recipe.ingredients.filter((i) => i.required).length > 3}
											<span class="ingredient-tag more"
												>+{recipe.ingredients.filter(
													(i) => i.required,
												).length - 3}</span
											>
										{/if}
									</div>
								</div>
							</div>
							<div class="recipe-footer">
								<button class="full-button">
									<i class="fas fa-utensils"></i> Start Cooking
								</button>
							</div>
						</div>
					{/each}
				</div>

				<div class="section-divider"></div>

				<h3 class="sub-section-title">Recipe Categories</h3>
				<div class="category-grid">
					<div class="category-card quick-meals">
						<h4>Quick Meals</h4>
						<p>Ready in 30 minutes or less</p>
					</div>
					<div class="category-card vegetarian">
						<h4>Vegetarian</h4>
						<p>Plant-based recipes</p>
					</div>
					<div class="category-card high-protein">
						<h4>High Protein</h4>
						<p>20+ grams of protein per serving</p>
					</div>
					<div class="category-card low-carb">
						<h4>Low Carb</h4>
						<p>Under 20g of carbs per serving</p>
					</div>
				</div>
			</section>
		{/if}

		<!-- Shopping List Tab -->
		{#if activeTab === "shopping"}
			<section class="fade-in">
				<div class="section-header">
					<h2>Shopping List</h2>
					<div class="filters">
						<div class="add-item-form">
							<input
								type="text"
								bind:value={newShoppingItem}
								placeholder="Add item..."
								class="add-item-input"
								on:keypress={(e) => {
									if (e.key === "Enter") {
										addToShoppingList();
									}
								}}
							/>
							<button
								class="icon-button add"
								on:click={addToShoppingList}
							>
								<i class="fas fa-plus"></i>
							</button>
						</div>
						<button class="icon-button">
							<i class="fas fa-ellipsis-v"></i>
						</button>
					</div>
				</div>

				<div class="shopping-list">
					<div class="list-header">
						<div class="list-column">Item</div>
						<div class="list-column">Category</div>
						<div class="list-column">Status</div>
						<div class="list-column">Actions</div>
					</div>

					{#each filteredShoppingList as item}
						<div class="list-item {item.checked ? 'checked' : ''}">
							<div class="list-column item-name">
								<input
									type="checkbox"
									checked={item.checked}
									on:change={() =>
										toggleShoppingItemChecked(item.id)}
								/>
								<span>{item.name}</span>
							</div>
							<div class="list-column">{item.category}</div>
							<div class="list-column">
								{#if item.automatic}
									<span class="auto-tag">
										<i class="fas fa-robot"></i> Auto
									</span>
									<span class="reason-tag">{item.reason}</span
									>
								{:else}
									<span class="manual-tag">Manual</span>
								{/if}
							</div>
							<div class="list-column actions">
								<button
									class="icon-button small"
									on:click={(e) => {
										e.stopPropagation();
										deleteShoppingItem(item.id);
										showNotification(
											`${item.name} removed from shopping list`,
										);
									}}
								>
									<i class="fas fa-trash-alt"></i>
								</button>
								<button class="icon-button small">
									<i class="fas fa-ellipsis-v"></i>
								</button>
							</div>
						</div>
					{/each}
				</div>

				{#if filteredShoppingList.length > 0}
					<div class="shopping-actions">
						<div class="counter">
							{filteredShoppingList.filter((item) => item.checked)
								.length}
							of {filteredShoppingList.length} items checked
						</div>
						<div class="action-buttons">
							<button class="secondary-button">
								<i class="fas fa-print"></i> Print List
							</button>
							<button class="primary-button">
								<i class="fas fa-shopping-cart"></i> Shop Online
							</button>
						</div>
					</div>
				{:else}
					<div class="empty-state">
						<i class="fas fa-shopping-cart empty-icon"></i>
						<p>Your shopping list is empty.</p>
						<div class="add-item-form wide">
							<input
								type="text"
								bind:value={newShoppingItem}
								placeholder="Add item..."
								class="add-item-input"
								on:keypress={(e) => {
									if (e.key === "Enter") {
										addToShoppingList();
									}
								}}
							/>
							<button
								class="icon-button add"
								on:click={addToShoppingList}
							>
								<i class="fas fa-plus"></i>
							</button>
						</div>
					</div>
				{/if}

				<div class="list-actions">
					<button
						class="secondary-button"
						on:click={() => sortShoppingList("category")}
					>
						<i class="fas fa-sort"></i> Sort by Category
					</button>
					<button
						class="secondary-button"
						on:click={() => clearCheckedItems()}
					>
						<i class="fas fa-trash"></i> Clear Checked Items
					</button>
					{#if hasAutomaticItems}
						<button
							class="secondary-button"
							on:click={() => refreshAutomaticItems()}
						>
							<i class="fas fa-sync"></i> Refresh Auto Items
						</button>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Nutrition Tab -->
		{#if activeTab === "nutrition"}
			<section class="fade-in">
				<div class="section-header">
					<h2>Nutrition Insights</h2>
					<div class="filters">
						<div class="select-container">
							<select>
								<option>Last 7 Days</option>
								<option>Last 30 Days</option>
								<option>This Month</option>
							</select>
						</div>
					</div>
				</div>

				<div class="dashboard-grid">
					<div class="dashboard-card">
						<h3>Calorie Intake</h3>
						<div class="stat">
							<span class="number">1,850</span>
							<span class="unit">cal/day</span>
						</div>
						<div class="progress-container">
							<div
								class="progress-bar high"
								style="width: 75%"
							></div>
						</div>
						<div class="stat-meta">
							<span>75% of daily target</span>
						</div>
					</div>

					<div class="dashboard-card">
						<h3>Protein</h3>
						<div class="stat">
							<span class="number">85</span>
							<span class="unit">g/day</span>
						</div>
						<div class="progress-container">
							<div
								class="progress-bar high"
								style="width: 94%"
							></div>
						</div>
						<div class="stat-meta">
							<span>94% of daily target</span>
						</div>
					</div>

					<div class="dashboard-card">
						<h3>Carbohydrates</h3>
						<div class="stat">
							<span class="number">210</span>
							<span class="unit">g/day</span>
						</div>
						<div class="progress-container">
							<div
								class="progress-bar medium"
								style="width: 65%"
							></div>
						</div>
						<div class="stat-meta">
							<span>65% of daily target</span>
						</div>
					</div>

					<div class="dashboard-card">
						<h3>Fat</h3>
						<div class="stat">
							<span class="number">62</span>
							<span class="unit">g/day</span>
						</div>
						<div class="progress-container">
							<div
								class="progress-bar medium"
								style="width: 60%"
							></div>
						</div>
						<div class="stat-meta">
							<span>60% of daily target</span>
						</div>
					</div>
				</div>

				<div class="section-divider"></div>

				<h3 class="sub-section-title">Nutrition Recommendations</h3>
				<div class="recommendation-list">
					<div class="recommendation-item">
						<div class="recommendation-icon">
							<i class="fas fa-lightbulb"></i>
						</div>
						<div class="recommendation-content">
							<h4>Increase Vegetable Intake</h4>
							<p>
								Try to include more green vegetables in your
								daily meals to increase fiber and essential
								vitamins.
							</p>
						</div>
					</div>

					<div class="recommendation-item">
						<div class="recommendation-icon">
							<i class="fas fa-lightbulb"></i>
						</div>
						<div class="recommendation-content">
							<h4>Monitor Sodium Intake</h4>
							<p>
								Your sodium intake is trending high. Consider
								reducing processed food consumption.
							</p>
						</div>
					</div>

					<div class="recommendation-item">
						<div class="recommendation-icon">
							<i class="fas fa-check-circle"></i>
						</div>
						<div class="recommendation-content">
							<h4>Good Protein Balance</h4>
							<p>
								You're consistently meeting your protein
								targets. Great job!
							</p>
						</div>
					</div>
				</div>

				<div class="section-divider"></div>

				<h3 class="sub-section-title">Recent Food Log</h3>

				<div class="food-log">
					<div class="food-log-header">
						<div class="log-column">Food Item</div>
						<div class="log-column">Amount</div>
						<div class="log-column">Calories</div>
						<div class="log-column">Time</div>
						<div class="log-column">Actions</div>
					</div>

					{#each filteredFoodLog as entry}
						<div class="food-log-item">
							<div class="log-column">{entry.name}</div>
							<div class="log-column">{entry.amount}</div>
							<div class="log-column">{entry.calories} cal</div>
							<div class="log-column">{entry.time}</div>
							<div class="log-column actions">
								<button class="icon-button small">
									<i class="fas fa-pencil-alt"></i>
								</button>
								<button class="icon-button small">
									<i class="fas fa-trash-alt"></i>
								</button>
							</div>
						</div>
					{/each}
				</div>

				<div class="add-log-entry">
					<button
						class="add-button"
						on:click={() => toggleFoodLogModal()}
					>
						<i class="fas fa-plus"></i> Log Food Item
					</button>
				</div>
			</section>
		{/if}
	</main>

	<!-- Item Detail Modal -->
	{#if isDetailModalOpen && selectedItem}
		<div class="modal-overlay" on:click={() => toggleDetailModal()}>
			<div class="modal" on:click={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>{selectedItem.name} Details</h3>
					<button
						on:click={() => toggleDetailModal()}
						class="close-button"
					>
						<i class="fas fa-times"></i>
					</button>
				</div>

				<div class="modal-content">
					<div class="item-columns">
						<div class="item-image-column">
							<img
								src={selectedItem.image.replace("/50", "/200")}
								alt={selectedItem.name}
							/>

							<div class="quick-actions">
								<h4>Quick Actions</h4>
								<button
									class="action-button primary"
									on:click={() => {
										useItem(selectedItem);
										toggleDetailModal();
									}}
								>
									<i class="fas fa-minus-circle"></i> Use Item
								</button>
								<button class="action-button">
									<i class="fas fa-pencil-alt"></i> Edit Item
								</button>
								<button class="action-button danger">
									<i class="fas fa-trash-alt"></i> Delete Item
								</button>
							</div>
						</div>

						<div class="item-info-column">
							<div class="info-grid">
								<div class="info-box">
									<p class="info-label">Category</p>
									<p class="info-value">
										{selectedItem.category}
									</p>
								</div>
								<div class="info-box">
									<p class="info-label">Location</p>
									<p class="info-value">
										{selectedItem.location}
									</p>
								</div>
								<div class="info-box">
									<p class="info-label">Quantity</p>
									<p class="info-value">
										{selectedItem.quantity}
									</p>
								</div>
								<div class="info-box">
									<p class="info-label">Expiry Date</p>
									<p
										class="info-value {getExpiryStatusClass(
											selectedItem.expiry,
										)}"
									>
										{new Date(
											selectedItem.expiry,
										).toLocaleDateString()}
										{#if calculateDaysUntilExpiry(selectedItem.expiry) > 0}
											<span
												>({calculateDaysUntilExpiry(
													selectedItem.expiry,
												)} days left)</span
											>
										{:else}
											<span>(Expired!)</span>
										{/if}
									</p>
								</div>
								{#if selectedItem.brand}
									<div class="info-box">
										<p class="info-label">Brand</p>
										<input
											type="text"
											class="info-value editable"
											value={selectedItem.brand || ""}
											placeholder="Add brand name"
											on:input={(e) => {
												selectedItem.brand =
													e.target.value;
												inventoryItems = inventoryItems;
											}}
										/>
									</div>
								{/if}
								{#if selectedItem.price}
									<div class="info-box">
										<p class="info-label">Price</p>
										<div class="price-edit">
											<span class="currency-symbol"
												>$</span
											>
											<input
												type="number"
												class="info-value editable"
												value={selectedItem.price || ""}
												placeholder="0.00"
												min="0"
												step="0.01"
												on:input={(e) => {
													selectedItem.price =
														parseFloat(
															e.target.value,
														) || 0;
													inventoryItems =
														inventoryItems;
												}}
											/>
										</div>
									</div>
								{/if}
							</div>

							<div class="progress-box">
								<h4>Remaining Quantity</h4>
								<div class="progress-container full">
									<div
										class="progress-bar {selectedItem.percentRemaining <=
										20
											? 'low'
											: selectedItem.percentRemaining <=
												  50
												? 'medium'
												: 'high'}"
										style="width: {selectedItem.percentRemaining}%"
									></div>
								</div>
								<p>
									{selectedItem.percentRemaining}% of {selectedItem.quantity}
									remaining
								</p>
							</div>

							<div class="related-recipes">
								<h4>Recipe Suggestions</h4>
								{#each filteredRecipes.filter( (recipe) => recipe.ingredients.some((ing) => ing.name === selectedItem.name), ) as recipe}
									<div
										class="related-recipe"
										on:click={() => {
											toggleDetailModal();
											toggleRecipeDetail(recipe);
										}}
									>
										<img
											src={recipe.image}
											alt={recipe.name}
										/>
										<div class="related-recipe-info">
											<h5>{recipe.name}</h5>
											<p>
												{recipe.cookTime} • {recipe.difficulty}
											</p>
										</div>
										<i class="fas fa-chevron-right"></i>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Recipe Detail Modal -->
	{#if isRecipeDetailOpen && selectedRecipe}
		<div class="modal-overlay" on:click={() => toggleRecipeDetail()}>
			<div
				class="modal recipe-modal"
				on:click={(e) => e.stopPropagation()}
			>
				<div class="modal-header recipe-header">
					<h3>{selectedRecipe.name}</h3>

					<div class="recipe-badges">
						{#if selectedRecipe.cookTime}
							<span class="recipe-badge">
								<i class="far fa-clock"></i>
								{selectedRecipe.cookTime}
							</span>
						{/if}
						{#if selectedRecipe.difficulty}
							<span class="recipe-badge">
								<i class="fas fa-utensils"></i>
								{selectedRecipe.difficulty}
							</span>
						{/if}
						{#if selectedRecipe.calories}
							<span class="recipe-badge">
								<i class="fas fa-fire"></i>
								{selectedRecipe.calories} cal
							</span>
						{/if}
						{#if selectedRecipe.servings}
							<span class="recipe-badge">
								<i class="fas fa-user"></i>
								{selectedRecipe.servings}
								{selectedRecipe.servings > 1
									? "servings"
									: "serving"}
							</span>
						{/if}
					</div>

					<button
						on:click={() => toggleRecipeDetail()}
						class="close-button"
					>
						<i class="fas fa-times"></i>
					</button>
				</div>

				<div class="recipe-hero">
					<img
						src={selectedRecipe.image.replace("/150", "/800")}
						alt={selectedRecipe.name}
					/>
				</div>

				<div class="modal-content recipe-detail">
					<div class="recipe-columns">
						<div class="recipe-ingredients-column">
							<div class="ingredients-list">
								<h4>Ingredients</h4>
								<ul>
									{#each selectedRecipe.ingredients as ingredient}
										<li
											class={ingredient.inInventory
												? "available"
												: ""}
										>
											<div class="ingredient-check">
												<input
													type="checkbox"
													id="ing-{ingredient.name}"
												/>
												<label
													for="ing-{ingredient.name}"
													>{ingredient.name}</label
												>
											</div>
											<span class="ingredient-amount"
												>{ingredient.amount}</span
											>
										</li>
									{/each}
								</ul>
							</div>

							<div class="ingredient-availability">
								<h4>What You Have</h4>
								<ul>
									{#each selectedRecipe.ingredients as ingredient}
										<li>
											{ingredient.name}
											{#if ingredient.inInventory}
												<span class="in-stock">
													<i class="fas fa-check"></i>
													In stock
												</span>
											{:else}
												<span class="missing">
													<i class="fas fa-times"></i>
													Missing
												</span>
											{/if}
										</li>
									{/each}
								</ul>
								<button class="secondary-button full-width">
									<i class="fas fa-shopping-cart"></i> Add Missing
									to Shopping List
								</button>
							</div>
						</div>

						<div class="recipe-instructions-column">
							<div class="instructions">
								<h4>Instructions</h4>
								<ol>
									{#each selectedRecipe.instructions as step, index}
										<li>
											<span class="step-number"
												>{index + 1}</span
											>
											<span class="step-text">{step}</span
											>
										</li>
									{/each}
								</ol>
							</div>

							<div class="recipe-tips">
								<h4>Tips</h4>
								<ul>
									<li>
										For best results, use fresh ingredients
										whenever possible.
									</li>
									<li>
										You can substitute spinach with kale if
										needed.
									</li>
									<li>
										Store leftovers in an airtight container
										for up to 3 days in the refrigerator.
									</li>
								</ul>
							</div>

							<button class="primary-button cook-button">
								<i class="fas fa-utensils"></i> Start Cooking
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Add Item Modal -->
	{#if isAddItemModalOpen}
		<div class="modal-overlay" on:click={toggleAddItemModal}>
			<div class="modal" on:click={(e) => e.stopPropagation()}>
				<div class="modal-header">
					<h3>Add New Item</h3>
					<button on:click={toggleAddItemModal} class="close-button">
						<i class="fas fa-times"></i>
					</button>
				</div>

				<div class="modal-content">
					<form on:submit|preventDefault={addNewItem}>
						<div class="form-grid">
							<div class="form-group">
								<label for="name"
									>Item Name <span class="required">*</span
									></label
								>
								<input
									type="text"
									id="name"
									bind:value={newItem.name}
									class={formErrors.name ? "error" : ""}
								/>
								{#if formErrors.name}
									<p class="error-message">
										{formErrors.name}
									</p>
								{/if}
							</div>

							<div class="form-group">
								<label for="category">Category</label>
								<select
									id="category"
									bind:value={newItem.category}
								>
									{#each categories as category}
										<option>{category}</option>
									{/each}
								</select>
							</div>

							<div class="form-group">
								<label for="quantity"
									>Quantity <span class="required">*</span
									></label
								>
								<div class="quantity-selector">
									<input
										type="number"
										id="quantity-amount"
										bind:value={newItem.quantityAmount}
										class={formErrors.quantity
											? "error"
											: ""}
										min="0.01"
										step="0.01"
										placeholder="Amount"
									/>
									<select
										id="quantity-type"
										bind:value={newItem.quantityType}
									>
										{#each quantityTypes as type}
											<option>{type}</option>
										{/each}
									</select>
								</div>
								{#if formErrors.quantity}
									<p class="error-message">
										{formErrors.quantity}
									</p>
								{/if}
							</div>

							<div class="form-group">
								<label for="location">Location</label>
								<select
									id="location"
									bind:value={newItem.location}
								>
									{#each locations as location}
										<option>{location}</option>
									{/each}
								</select>
							</div>

							<div class="form-group">
								<label for="brand">Brand</label>
								<input
									type="text"
									id="brand"
									bind:value={newItem.brand}
									placeholder="Enter brand name"
								/>
							</div>

							<div class="form-group">
								<label for="price">Price ($)</label>
								<input
									type="number"
									id="price"
									bind:value={newItem.price}
									class={formErrors.price ? "error" : ""}
									placeholder="0.00"
									min="0"
									step="0.01"
								/>
								{#if formErrors.price}
									<p class="error-message">
										{formErrors.price}
									</p>
								{/if}
							</div>

							<div class="form-group">
								<label for="expiry"
									>Expiry Date <span class="required">*</span
									></label
								>
								<div class="date-picker-container">
									<input
										type="date"
										id="expiry"
										bind:value={newItem.expiry}
										class={formErrors.expiry ? "error" : ""}
									/>
									<button
										type="button"
										class="calendar-button"
										on:click={(e) => {
											e.preventDefault();
											try {
												// Modern browsers
												document
													.getElementById("expiry")
													.showPicker();
											} catch (err) {
												// Fallback for browsers without showPicker
												document
													.getElementById("expiry")
													.focus();
											}
										}}
									>
										<i class="fas fa-calendar-alt"></i>
									</button>
								</div>
								{#if formErrors.expiry}
									<p class="error-message">
										{formErrors.expiry}
									</p>
								{/if}
							</div>
						</div>

						<div class="form-actions">
							<button
								type="button"
								class="secondary-button"
								on:click={toggleAddItemModal}
							>
								Cancel
							</button>
							<button type="submit" class="primary-button">
								Add Item
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}

	{#if isFoodLogModalOpen}
		<div class="modal-overlay" on:click={toggleFoodLogModal}>
			<div
				class="modal small-modal"
				on:click={(e) => e.stopPropagation()}
			>
				<div class="modal-header">
					<h3>Log Food Item</h3>
					<button on:click={toggleFoodLogModal} class="close-button">
						<i class="fas fa-times"></i>
					</button>
				</div>

				<div class="modal-content">
					<form
						on:submit|preventDefault={() => {
							// Add food log entry logic would go here
							toggleFoodLogModal();
						}}
					>
						<div class="form-group">
							<label for="food-name"
								>Food Item <span class="required">*</span
								></label
							>
							<input type="text" id="food-name" required />
						</div>

						<div class="form-group">
							<label for="food-amount"
								>Amount <span class="required">*</span></label
							>
							<input
								type="text"
								id="food-amount"
								placeholder="e.g., 1 serving, 100g"
								required
							/>
						</div>

						<div class="form-group">
							<label for="food-calories"
								>Calories <span class="required">*</span></label
							>
							<input
								type="number"
								id="food-calories"
								min="0"
								required
							/>
						</div>

						<div class="form-group">
							<label for="food-time"
								>Time <span class="required">*</span></label
							>
							<input type="time" id="food-time" required />
						</div>

						<div class="form-group">
							<label for="food-source">Source</label>
							<select id="food-source">
								<option>Inventory Item</option>
								<option>Recipe</option>
								<option>Custom Entry</option>
							</select>
						</div>

						<div class="form-actions">
							<button
								type="button"
								class="secondary-button"
								on:click={toggleFoodLogModal}
							>
								Cancel
							</button>
							<button type="submit" class="primary-button">
								Add Log Entry
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}
</div>

<svelte:head>
	<link
		href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
		rel="stylesheet"
	/>
</svelte:head>

<style>
	/* Base Styles */
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
			Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
		background-color: #121212;
		color: #e0e0e0;
	}

	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.fade-in {
		animation: fadeIn 0.3s ease-in;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Header */
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background-color: #121212;
		border-bottom: 1px solid #333;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.logo h1 {
		font-size: 1.5rem;
		margin: 0;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.search-container {
		position: relative;
	}

	.search-input {
		padding: 0.5rem 0.75rem 0.5rem 2rem;
		border-radius: 4px;
		border: 1px solid #444;
		background-color: #2a2a2a;
		color: #e0e0e0;
		width: 200px;
		font-size: 0.875rem;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: #777;
	}

	/* Navigation */
	.main-nav {
		display: flex;
		background-color: #1e1e1e;
		border-bottom: 1px solid #333;
		overflow-x: auto;
	}

	.nav-button {
		padding: 0.75rem 1.5rem;
		color: #aaa;
		background: none;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		white-space: nowrap;
	}

	.nav-button.active {
		color: #4caf50;
		border-bottom: 2px solid #4caf50;
	}

	.nav-button:hover:not(.active) {
		color: #e0e0e0;
		background-color: #333;
	}

	/* Main Content */
	.main-content {
		flex: 1;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.section-header h2 {
		font-size: 1.5rem;
		margin: 0;
	}

	.section-divider {
		height: 1px;
		background-color: #333;
		margin: 2rem 0;
	}

	.sub-section-title {
		font-size: 1.25rem;
		margin: 0 0 1rem;
	}

	/* Filters */
	.filters {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.select-container {
		position: relative;
	}

	select {
		appearance: none;
		background-color: #2a2a2a;
		border: 1px solid #444;
		border-radius: 4px;
		padding: 0.5rem 2rem 0.5rem 0.75rem;
		color: #e0e0e0;
		font-size: 0.875rem;
		cursor: pointer;
		width: 100%;
		height: 38px;
	}

	.select-container::after {
		content: "\f107";
		font-family: "Font Awesome 5 Free";
		font-weight: 900;
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: #888;
	}

	/* Buttons */
	.icon-button {
		background-color: #2a2a2a;
		border: 1px solid #444;
		border-radius: 4px;
		color: #e0e0e0;
		padding: 0.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-button:hover {
		background-color: #333;
	}

	.icon-button.small {
		padding: 0.25rem;
		font-size: 0.75rem;
	}

	.icon-button.add {
		background-color: #4caf50;
		border-color: #4caf50;
	}

	.icon-button.add:hover {
		background-color: #3d8b40;
	}

	.add-button {
		background-color: #4caf50;
		border: none;
		border-radius: 4px;
		color: white;
		padding: 0.5rem 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
	}

	.add-button:hover {
		background-color: #3d8b40;
	}

	.primary-button {
		background-color: #4caf50;
		border: none;
		border-radius: 4px;
		color: white;
		padding: 0.75rem 1.5rem;
		cursor: pointer;
		font-weight: 500;
	}

	.primary-button:hover {
		background-color: #3d8b40;
	}

	.secondary-button {
		background-color: #2a2a2a;
		border: 1px solid #444;
		border-radius: 4px;
		color: #e0e0e0;
		padding: 0.75rem 1.5rem;
		cursor: pointer;
		font-weight: 500;
	}

	.secondary-button:hover {
		background-color: #333;
	}

	.secondary-button.full-width {
		width: 100%;
		display: block;
		text-align: center;
		margin-top: 1rem;
	}

	.full-button {
		width: 100%;
		background-color: #4caf50;
		border: none;
		border-radius: 0;
		color: white;
		padding: 0.75rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-weight: 500;
	}

	.full-button:hover {
		background-color: #3d8b40;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		background-color: #1e1e1e;
		border-radius: 0.5rem;
		border: 1px solid #333;
		text-align: center;
	}

	.empty-icon {
		font-size: 3rem;
		color: #444;
		margin-bottom: 1rem;
	}

	.empty-state p {
		margin: 0 0 1.5rem;
		color: #888;
	}

	.add-item-form {
		display: flex;
		gap: 0.5rem;
	}

	.add-item-form.wide {
		width: 100%;
		max-width: 400px;
	}

	.add-item-input {
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		border: 1px solid #444;
		background-color: #2a2a2a;
		color: #e0e0e0;
		font-size: 0.875rem;
		flex: 1;
	}

	/* Inventory Grid */
	.inventory-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.inventory-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.inventory-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.inventory-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	/* Inventory Item */
	.inventory-item {
		background-color: #1e1e1e;
		border: 1px solid #333;
		border-radius: 0.5rem;
		overflow: hidden;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.inventory-item:hover {
		border-color: #444;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
	}

	.item-content {
		padding: 1rem;
		display: flex;
		gap: 1rem;
	}

	.item-image {
		width: 50px;
		height: 50px;
		flex-shrink: 0;
	}

	.item-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 0.25rem;
	}

	.item-details {
		flex: 1;
	}

	.item-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.25rem;
	}

	.item-header h3 {
		margin: 0;
		font-size: 1rem;
	}

	.location-tag {
		font-size: 0.75rem;
		background-color: #333;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		color: #bbb;
	}

	.item-quantity {
		font-size: 0.875rem;
		color: #aaa;
		margin: 0.25rem 0 0.5rem;
	}

	.progress-container {
		height: 8px;
		background-color: #333;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.25rem;
	}

	.progress-container.full {
		height: 12px;
		margin: 0.5rem 0;
	}

	.progress-bar {
		height: 100%;
		border-radius: 4px;
	}

	.progress-bar.high {
		background-color: #4caf50;
	}

	.progress-bar.medium {
		background-color: #ff9800;
	}

	.progress-bar.low {
		background-color: #f44336;
	}

	.item-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		color: #888;
	}

	.expiry-date.valid {
		color: #4caf50;
	}

	.expiry-date.expiring-soon {
		color: #ff9800;
	}

	.expiry-date.expired {
		color: #f44336;
	}

	.item-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		background-color: #262626;
		border-top: 1px solid #333;
	}

	.price-tag {
		font-size: 0.875rem;
		color: #aaa;
	}

	.action-button {
		background: none;
		border: none;
		color: #aaa;
		font-size: 0.875rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.action-button:hover {
		color: #e0e0e0;
	}

	.action-button.primary {
		background-color: #4caf50;
		color: white;
		border-radius: 4px;
		padding: 0.5rem 1rem;
		width: 100%;
		justify-content: center;
		margin-bottom: 0.5rem;
	}

	.action-button.primary:hover {
		background-color: #3d8b40;
	}

	.action-button.danger {
		background-color: #f44336;
		color: white;
		border-radius: 4px;
		padding: 0.5rem 1rem;
		width: 100%;
		justify-content: center;
	}

	.action-button.danger:hover {
		background-color: #d32f2f;
	}

	/* Recipe Grid */
	.recipe-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 640px) {
		.recipe-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.recipe-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.recipe-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	/* Recipe Card */
	.recipe-card {
		background-color: #1e1e1e;
		border: 1px solid #333;
		border-radius: 0.5rem;
		overflow: hidden;
		transition: all 0.2s ease;
		cursor: pointer;
		display: flex;
		flex-direction: column;
	}

	.recipe-card:hover {
		border-color: #444;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
	}

	.recipe-image {
		position: relative;
		height: 180px;
	}

	.recipe-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.match-badge {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background-color: rgba(76, 175, 80, 0.8);
		color: white;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
	}

	.recipe-content {
		padding: 1rem;
		flex: 1;
	}

	.recipe-content h3 {
		margin: 0 0 0.5rem;
		font-size: 1.125rem;
	}

	.recipe-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		font-size: 0.75rem;
		color: #aaa;
		margin-bottom: 0.75rem;
	}

	.recipe-ingredients p {
		margin: 0 0 0.5rem;
		font-size: 0.875rem;
		color: #aaa;
	}

	.ingredient-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.ingredient-tag {
		font-size: 0.75rem;
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		background-color: #333;
		color: #bbb;
	}

	.ingredient-tag.available {
		background-color: rgba(76, 175, 80, 0.2);
		color: #81c784;
		border: 1px solid rgba(76, 175, 80, 0.3);
	}

	.ingredient-tag.missing {
		background-color: rgba(244, 67, 54, 0.2);
		color: #e57373;
		border: 1px solid rgba(244, 67, 54, 0.3);
	}

	.ingredient-tag.more {
		background-color: #444;
	}

	.recipe-footer {
		margin-top: auto;
	}

	/* Category Grid */
	.category-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.category-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.category-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	/* Category Card */
	.category-card {
		background-color: #1e1e1e;
		border: 1px solid #333;
		border-radius: 0.5rem;
		overflow: hidden;
		transition: all 0.2s ease;
		cursor: pointer;
		padding: 1.5rem;
		position: relative;
	}

	.category-card::before {
		content: "";
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 6px;
	}

	.category-card:hover {
		border-color: #444;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
	}

	.category-card h4 {
		margin: 0 0 0.5rem;
		font-size: 1.125rem;
	}

	.category-card p {
		margin: 0;
		font-size: 0.875rem;
		color: #aaa;
	}

	.quick-meals::before {
		background-color: #f44336;
	}

	.vegetarian::before {
		background-color: #4caf50;
	}

	.high-protein::before {
		background-color: #2196f3;
	}

	.low-carb::before {
		background-color: #9c27b0;
	}

	/* Shopping List */
	.shopping-list {
		background-color: #1e1e1e;
		border: 1px solid #333;
		border-radius: 0.5rem;
		overflow: hidden;
		margin-bottom: 1.5rem;
	}

	.list-header {
		display: grid;
		grid-template-columns: 2fr 1fr 2fr 1fr;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: #262626;
		border-bottom: 1px solid #333;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.list-item {
		display: grid;
		grid-template-columns: 2fr 1fr 2fr 1fr;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #333;
		align-items: center;
		font-size: 0.875rem;
		transition: background-color 0.2s;
	}

	.list-item:last-child {
		border-bottom: none;
	}

	.list-item:hover {
		background-color: #262626;
	}

	.list-item.checked {
		background-color: rgba(76, 175, 80, 0.1);
	}

	.list-item.checked .item-name span {
		text-decoration: line-through;
		color: #888;
	}

	.item-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.item-name input[type="checkbox"] {
		margin: 0;
	}

	.auto-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		background-color: rgba(33, 150, 243, 0.2);
		color: #64b5f6;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		margin-right: 0.5rem;
	}

	.manual-tag {
		display: inline-flex;
		align-items: center;
		font-size: 0.75rem;
		background-color: #333;
		color: #bbb;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
	}

	.reason-tag {
		font-size: 0.75rem;
		color: #888;
	}

	.list-column.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.25rem;
	}

	.shopping-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 0;
	}

	.counter {
		font-size: 0.875rem;
		color: #aaa;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
	}

	/* Dashboard Grid */
	.dashboard-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.dashboard-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.dashboard-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	/* Dashboard Card */
	.dashboard-card {
		background-color: #1e1e1e;
		border: 1px solid #333;
		border-radius: 0.5rem;
		padding: 1.25rem;
	}

	.dashboard-card h3 {
		margin: 0 0 1rem;
		font-size: 1rem;
		color: #aaa;
	}

	.stat {
		display: flex;
		align-items: baseline;
		margin-bottom: 0.75rem;
	}

	.number {
		font-size: 1.75rem;
		font-weight: 600;
		margin-right: 0.5rem;
	}

	.unit {
		font-size: 0.875rem;
		color: #aaa;
	}

	.stat-meta {
		font-size: 0.75rem;
		color: #888;
		margin-top: 0.5rem;
	}

	/* Recommendation List */
	.recommendation-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.recommendation-item {
		background-color: #1e1e1e;
		border: 1px solid #333;
		border-radius: 0.5rem;
		padding: 1rem;
		display: flex;
		gap: 1rem;
	}

	.recommendation-icon {
		font-size: 1.5rem;
		color: #4caf50;
		flex-shrink: 0;
	}

	.recommendation-content h4 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}

	.recommendation-content p {
		margin: 0;
		font-size: 0.875rem;
		color: #aaa;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.75);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background-color: #1e1e1e;
		border-radius: 0.5rem;
		width: 100%;
		max-width: 800px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
		border: 1px solid #333;
	}

	.modal.recipe-modal {
		max-width: 900px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid #333;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.25rem;
	}

	.close-button {
		background: none;
		border: none;
		color: #aaa;
		cursor: pointer;
		font-size: 1.25rem;
	}

	.close-button:hover {
		color: #e0e0e0;
	}

	.modal-content {
		padding: 1.5rem;
	}

	/* Recipe Modal */
	.recipe-hero {
		position: relative;
	}

	.recipe-hero img {
		width: 100%;
		height: 200px;
		object-fit: cover;
	}

	.recipe-badges {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 1rem;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.recipe-badge {
		background-color: rgba(255, 255, 255, 0.2);
		border-radius: 9999px;
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.recipe-detail {
		padding-top: 2rem;
	}

	.recipe-columns {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		.recipe-columns {
			grid-template-columns: 1fr 2fr;
		}
	}

	.recipe-ingredients-column > div {
		background-color: #262626;
		border-radius: 0.5rem;
		border: 1px solid #333;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.recipe-ingredients-column > div:last-child {
		margin-bottom: 0;
	}

	.ingredients-list h4,
	.ingredient-availability h4,
	.instructions h4,
	.recipe-tips h4 {
		margin: 0 0 1rem;
		font-size: 1.125rem;
	}

	.ingredients-list ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.ingredients-list li {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px solid #333;
	}

	.ingredients-list li:last-child {
		border-bottom: none;
	}

	.ingredients-list li.available {
		color: #4caf50;
	}

	.ingredient-check {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.ingredient-amount {
		color: #888;
	}

	.ingredient-availability ul {
		list-style: none;
		padding: 0;
		margin: 0 0 1rem;
	}

	.ingredient-availability li {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px solid #333;
	}

	.ingredient-availability li:last-child {
		border-bottom: none;
	}

	.in-stock {
		color: #4caf50;
	}

	.missing {
		color: #f44336;
	}

	.recipe-instructions-column > div {
		background-color: #262626;
		border-radius: 0.5rem;
		border: 1px solid #333;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.recipe-instructions-column > div:last-child {
		margin-bottom: 0;
	}

	.instructions ol {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.instructions li {
		display: flex;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.instructions li:last-child {
		margin-bottom: 0;
	}

	.step-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 9999px;
		background-color: #4caf50;
		color: white;
		font-size: 0.75rem;
		font-weight: 500;
		margin-right: 0.75rem;
		flex-shrink: 0;
	}

	.recipe-tips ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.recipe-tips li {
		padding: 0.5rem 0;
		border-bottom: 1px solid #333;
	}

	.recipe-tips li:last-child {
		border-bottom: none;
	}

	.cook-button {
		display: block;
		width: 100%;
		margin-top: 1.5rem;
		padding: 0.75rem;
		font-size: 1rem;
	}

	/* Detail Modal */
	.item-columns {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		.item-columns {
			grid-template-columns: 1fr 2fr;
		}
	}

	.item-image-column img {
		width: 250px;
		height: 250px;
		object-fit: cover;
		border-radius: 0.5rem;
		margin: 0 auto 1rem;
		display: block;
		border: 1px solid #333;
	}

	.quick-actions {
		background-color: #262626;
		border-radius: 0.5rem;
		padding: 1rem;
		border: 1px solid #333;
	}

	.quick-actions h4 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1rem;
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.info-box {
		background-color: #262626;
		border-radius: 0.5rem;
		padding: 0.75rem;
		border: 1px solid #333;
	}

	.info-label {
		margin: 0 0 0.25rem;
		font-size: 0.75rem;
		color: #888;
	}

	.info-value {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.info-value.editable {
		background-color: rgba(42, 42, 42, 0.7);
		border: 1px solid #444;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		width: 100%;
		box-sizing: border-box;
	}

	.info-value.editable:focus {
		background-color: #2a2a2a;
		border-color: #4caf50;
		outline: none;
	}

	.progress-box {
		background-color: #262626;
		border-radius: 0.5rem;
		padding: 1rem;
		border: 1px solid #333;
		margin-bottom: 1.5rem;
	}

	.progress-box h4 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1rem;
	}

	.progress-box p {
		margin: 0.5rem 0 0;
		font-size: 0.875rem;
		color: #aaa;
	}

	.related-recipes {
		background-color: #262626;
		border-radius: 0.5rem;
		padding: 1rem;
		border: 1px solid #333;
	}

	.related-recipes h4 {
		margin-top: 0;
		margin-bottom: 1rem;
		font-size: 1rem;
	}

	.related-recipe {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 0.375rem;
		cursor: pointer;
		margin-bottom: 0.5rem;
	}

	.related-recipe:last-child {
		margin-bottom: 0;
	}

	.related-recipe:hover {
		background-color: #333;
	}

	.related-recipe img {
		width: 40px;
		height: 40px;
		object-fit: cover;
		border-radius: 4px;
	}

	.related-recipe-info {
		flex: 1;
	}

	.related-recipe-info h5 {
		margin: 0 0 0.25rem;
		font-size: 0.875rem;
	}

	.related-recipe-info p {
		margin: 0;
		font-size: 0.75rem;
		color: #888;
	}

	/* Form Styles */
	.form-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.form-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.form-group {
		margin-bottom: 0.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.375rem;
		font-size: 0.875rem;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		border: 1px solid #444;
		background-color: #2a2a2a;
		color: #e0e0e0;
		font-size: 0.875rem;
		height: 38px;
		box-sizing: border-box;
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		border-color: #4caf50;
		outline: none;
	}

	.form-group input.error,
	.form-group select.error,
	.form-group textarea.error {
		border-color: #f44336;
	}

	.error-message {
		color: #f44336;
		font-size: 0.75rem;
		margin: 0.25rem 0 0;
	}

	.required {
		color: #f44336;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.quantity-adjuster {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
	}

	.quantity-input {
		width: 100%;
		padding: 0.375rem;
		border-radius: 4px;
		border: 1px solid #444;
		background-color: #2a2a2a;
		color: #e0e0e0;
		font-size: 0.875rem;
		text-align: center;
	}

	.quantity-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.action-button.add {
		background-color: #4caf50;
		color: white;
		flex: 1;
		justify-content: center;
		border-radius: 4px;
		padding: 0.375rem;
	}

	.action-button.remove {
		background-color: #f44336;
		color: white;
		flex: 1;
		justify-content: center;
		border-radius: 4px;
		padding: 0.375rem;
	}

	.recipe-header {
		display: grid;
		grid-template-columns: 1fr auto auto;
		align-items: center;
		gap: 1rem;
	}

	.recipe-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.recipe-badge {
		background-color: #2a2a2a;
		border: 1px solid rgba(76, 175, 80, 0.3);
		border-radius: 9999px;
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		white-space: nowrap;
		color: #e0e0e0;
	}

	.recipe-badge i {
		color: #4caf50;
	}

	.food-log {
		background-color: #1e1e1e;
		border: 1px solid #333;
		border-radius: 0.5rem;
		overflow: hidden;
		margin-bottom: 1.5rem;
	}

	.food-log-header {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: #262626;
		border-bottom: 1px solid #333;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.food-log-item {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #333;
		align-items: center;
		font-size: 0.875rem;
		transition: background-color 0.2s;
	}

	.food-log-item:last-child {
		border-bottom: none;
	}

	.food-log-item:hover {
		background-color: #262626;
	}

	.add-log-entry {
		display: flex;
		justify-content: center;
		margin-top: 1rem;
	}

	.list-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.small-modal {
		max-width: 500px;
	}

	.quantity-selector {
		display: flex;
		gap: 0.5rem;
		width: 100%;
	}

	.quantity-selector input {
		flex: 1;
		min-width: 0;
	}

	.quantity-selector select {
		width: 45%;
		min-width: 0;
	}

	select option {
		background-color: #2a2a2a;
		color: #e0e0e0;
	}

	.date-picker-container {
		display: flex;
		position: relative;
		width: 100%;
	}

	.date-picker-container input[type="date"] {
		width: 100%;
		padding-right: 40px; /* Make room for the calendar button */
	}

	.calendar-button {
		position: absolute;
		right: 0;
		top: 0;
		height: 100%;
		background: none;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 10px;
		color: #aaa;
		cursor: pointer;
		z-index: 2;
	}

	.calendar-button:hover {
		color: #e0e0e0;
	}

	/* Make native date picker styling more consistent across browsers */
	input[type="date"] {
		appearance: none;
		-webkit-appearance: none;
		padding: 0.5rem 0.75rem;
		background-color: #2a2a2a;
		color: #e0e0e0;
		border: 1px solid #444;
		border-radius: 4px;
		height: 38px;
		box-sizing: border-box;
	}

	input[type="date"]::-webkit-calendar-picker-indicator {
		filter: invert(0.8);
		cursor: pointer;
		opacity: 0.8;
		position: absolute;
		right: 10px;
		width: 20px;
		height: 20px;
	}

	input[type="date"]::before {
		color: #e0e0e0;
		content: attr(value);
	}

	/* Notification styles */
	.notification-container {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 2000;
		max-width: 350px;
	}

	.notification {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		margin-bottom: 10px;
		border-radius: 4px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
		animation: slideIn 0.3s ease-out forwards;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.notification.success {
		background-color: rgba(76, 175, 80, 0.9);
		color: white;
	}

	.notification.info {
		background-color: rgba(33, 150, 243, 0.9);
		color: white;
	}

	.notification.warning {
		background-color: rgba(255, 152, 0, 0.9);
		color: white;
	}

	.notification.error {
		background-color: rgba(244, 67, 54, 0.9);
		color: white;
	}

	.notification-message {
		font-size: 0.9rem;
	}

	.notification-close {
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		margin-left: 10px;
		opacity: 0.8;
	}

	.notification-close:hover {
		opacity: 1;
	}

	.price-edit {
		position: relative;
		display: flex;
		align-items: center;
	}

	.price-edit input {
		padding-left: 1.25rem;
	}

	.currency-symbol {
		position: absolute;
		left: 0.5rem;
		color: #888;
	}
</style>
