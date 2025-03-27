<script>
	import { onMount } from 'svelte';
  
	// Mock data
	const inventoryItems = [
	  { id: 1, name: 'Milk', quantity: '1 gallon', location: 'Main Fridge', expiry: '2025-04-01', category: 'Dairy', image: 'https://via.placeholder.com/50', percentRemaining: 80 },
	  { id: 2, name: 'Eggs', quantity: '10 count', location: 'Main Fridge', expiry: '2025-04-13', category: 'Dairy', image: 'https://via.placeholder.com/50', percentRemaining: 90 },
	  { id: 3, name: 'Spinach', quantity: '1 bag', location: 'Main Fridge', expiry: '2025-03-30', category: 'Produce', image: 'https://via.placeholder.com/50', percentRemaining: 60 },
	  { id: 4, name: 'Chicken Breast', quantity: '2 lbs', location: 'Freezer', expiry: '2025-06-15', category: 'Meat', image: 'https://via.placeholder.com/50', percentRemaining: 100 },
	  { id: 5, name: 'Rice', quantity: '2 lbs', location: 'Pantry', expiry: '2025-12-31', category: 'Grains', image: 'https://via.placeholder.com/50', percentRemaining: 45 },
	];
  
	// State variables
	let activeTab = 'inventory';
	let selectedLocation = 'All Locations';
	let selectedCategory = 'All Categories';
	let sortBy = 'expiryDate';
	let sortOrder = 'asc';
	let searchQuery = '';
	let isDetailModalOpen = false;
	let selectedItem = null;
	let filteredItems = [];
	
	function setActiveTab(tab) {
	  activeTab = tab;
	}
  
	function filterInventory() {
	  // Start with all items
	  let result = [...inventoryItems];
	  
	  // Filter by location
	  if (selectedLocation !== 'All Locations') {
		result = result.filter(item => item.location === selectedLocation);
	  }
	  
	  // Filter by category
	  if (selectedCategory !== 'All Categories') {
		result = result.filter(item => item.category === selectedCategory);
	  }
	  
	  // Filter by search
	  if (searchQuery.trim() !== '') {
		result = result.filter(item => 
		  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		  item.category.toLowerCase().includes(searchQuery.toLowerCase())
		);
	  }
	  
	  // Sort items
	  if (sortBy === 'name') {
		result.sort((a, b) => sortOrder === 'asc' ? 
		  a.name.localeCompare(b.name) : 
		  b.name.localeCompare(a.name));
	  } else if (sortBy === 'expiryDate') {
		result.sort((a, b) => {
		  const dateA = new Date(a.expiry);
		  const dateB = new Date(b.expiry);
		  return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
		});
	  } else if (sortBy === 'percentRemaining') {
		result.sort((a, b) => sortOrder === 'asc' ? 
		  a.percentRemaining - b.percentRemaining : 
		  b.percentRemaining - a.percentRemaining);
	  }
	  
	  filteredItems = result;
	}
  
	function toggleDetailModal(item = null) {
	  selectedItem = item;
	  isDetailModalOpen = !isDetailModalOpen;
	}
  
	function calculateDaysUntilExpiry(expiryDate) {
	  const expiry = new Date(expiryDate);
	  const today = new Date();
	  const diffTime = expiry - today;
	  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	  return diffDays;
	}
  
	onMount(() => {
	  filterInventory();
	});
  
	$: {
	  filterInventory();
	}
  </script>
  
  <div class="app">
	<!-- Header -->
	<header class="header">
	  <div class="logo">
		<i class="fas fa-utensils"></i>
		<h1>Kitchinventory</h1>
	  </div>
	  <div class="header-actions">
		<button class="icon-button">
		  <i class="fas fa-search"></i>
		</button>
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
		on:click={() => setActiveTab('inventory')}>
		<i class="fas fa-box-open"></i> Inventory
	  </button>
	  <button 
		class="nav-button {activeTab === 'recipes' ? 'active' : ''}"
		on:click={() => setActiveTab('recipes')}>
		<i class="fas fa-utensils"></i> Recipes
	  </button>
	  <button 
		class="nav-button {activeTab === 'shopping' ? 'active' : ''}"
		on:click={() => setActiveTab('shopping')}>
		<i class="fas fa-shopping-cart"></i> Shopping
	  </button>
	  <button 
		class="nav-button {activeTab === 'nutrition' ? 'active' : ''}"
		on:click={() => setActiveTab('nutrition')}>
		<i class="fas fa-chart-pie"></i> Nutrition
	  </button>
	</nav>
  
	<!-- Main Content -->
	<main class="main-content">
	  {#if activeTab === 'inventory'}
		<section>
		  <div class="section-header">
			<h2>My Inventory</h2>
			<div class="filters">
			  <div class="select-container">
				<select 
				  bind:value={selectedLocation}
				  on:change={filterInventory}>
				  <option>All Locations</option>
				  <option>Main Fridge</option>
				  <option>Freezer</option>
				  <option>Pantry</option>
				</select>
			  </div>
			  
			  <div class="select-container">
				<select 
				  bind:value={selectedCategory}
				  on:change={filterInventory}>
				  <option>All Categories</option>
				  <option>Dairy</option>
				  <option>Produce</option>
				  <option>Meat</option>
				  <option>Grains</option>
				</select>
			  </div>
			  
			  <div class="select-container">
				<select 
				  bind:value={sortBy}
				  on:change={filterInventory}>
				  <option value="expiryDate">Sort by Expiry</option>
				  <option value="name">Sort by Name</option>
				  <option value="percentRemaining">Sort by Remaining</option>
				</select>
			  </div>
			  
			  <button 
				class="icon-button"
				on:click={() => { sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; filterInventory(); }}>
				<i class="fas fa-{sortOrder === 'asc' ? 'sort-amount-down-alt' : 'sort-amount-up-alt'}"></i>
			  </button>
			  
			  <button class="add-button">
				<i class="fas fa-plus"></i> Add Item
			  </button>
			</div>
		  </div>
  
		  <div class="inventory-grid">
			{#each filteredItems as item}
			  <div class="inventory-item" on:click={() => toggleDetailModal(item)}>
				<div class="item-content">
				  <div class="item-image">
					<img src={item.image} alt={item.name}>
				  </div>
				  <div class="item-details">
					<div class="item-header">
					  <h3>{item.name}</h3>
					  <span class="location-tag">{item.location}</span>
					</div>
					<p class="item-quantity">{item.quantity}</p>
					<div class="progress-container">
					  <div class="progress-bar" style="width: {item.percentRemaining}%"></div>
					</div>
					<div class="item-meta">
					  <span>{item.percentRemaining}% Remaining</span>
					  <span class="expiry-date">
						Expires: {new Date(item.expiry).toLocaleDateString()}
					  </span>
					</div>
				  </div>
				</div>
				<div class="item-actions">
				  <button class="action-button">
					<i class="fas fa-pencil-alt"></i> Edit
				  </button>
				  <button class="action-button">
					<i class="fas fa-minus-circle"></i> Use
				  </button>
				</div>
			  </div>
			{/each}
		  </div>
		</section>
	  {/if}
	</main>
  
	<!-- Item Detail Modal -->
	{#if isDetailModalOpen && selectedItem}
	  <div class="modal-overlay">
		<div class="modal">
		  <div class="modal-header">
			<h3>{selectedItem.name} Details</h3>
			<button on:click={() => toggleDetailModal()} class="close-button">
			  <i class="fas fa-times"></i>
			</button>
		  </div>
		  
		  <div class="modal-content">
			<div class="item-columns">
			  <div class="item-image-column">
				<img src={selectedItem.image.replace('/50', '/200')} alt={selectedItem.name}>
				
				<div class="quick-actions">
				  <h4>Quick Actions</h4>
				  <button class="action-button primary">
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
					<p class="info-value">{selectedItem.category}</p>
				  </div>
				  <div class="info-box">
					<p class="info-label">Location</p>
					<p class="info-value">{selectedItem.location}</p>
				  </div>
				  <div class="info-box">
					<p class="info-label">Quantity</p>
					<p class="info-value">{selectedItem.quantity}</p>
				  </div>
				  <div class="info-box">
					<p class="info-label">Expiry Date</p>
					<p class="info-value">
					  {new Date(selectedItem.expiry).toLocaleDateString()}
					  {#if calculateDaysUntilExpiry(selectedItem.expiry) > 0}
						<span>({calculateDaysUntilExpiry(selectedItem.expiry)} days left)</span>
					  {:else}
						<span>(Expired!)</span>
					  {/if}
					</p>
				  </div>
				</div>
				
				<div class="progress-box">
				  <h4>Remaining Quantity</h4>
				  <div class="progress-container full">
					<div class="progress-bar" style="width: {selectedItem.percentRemaining}%"></div>
				  </div>
				  <p>{selectedItem.percentRemaining}% of {selectedItem.quantity} remaining</p>
				</div>
			  </div>
			</div>
		  </div>
		</div>
	  </div>
	{/if}
  </div>
  
  <svelte:head>
	<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet">
  </svelte:head>
  
  <style>
	/* Base Styles */
	:global(body) {
	  margin: 0;
	  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
	  background-color: #121212;
	  color: #e0e0e0;
	}
  
	.app {
	  display: flex;
	  flex-direction: column;
	  min-height: 100vh;
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
	}
  
	/* Navigation */
	.main-nav {
	  display: flex;
	  background-color: #1e1e1e;
	  border-bottom: 1px solid #333;
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
  
	/* Filters */
	.filters {
	  display: flex;
	  gap: 0.5rem;
	  flex-wrap: wrap;
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
	}
  
	.select-container::after {
	  content: '\f107';
	  font-family: 'Font Awesome 5 Free';
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
	}
  
	.icon-button:hover {
	  background-color: #333;
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
	}
  
	.add-button:hover {
	  background-color: #3d8b40;
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
	  background-color: #4caf50;
	  border-radius: 4px;
	}
  
	.item-meta {
	  display: flex;
	  justify-content: space-between;
	  font-size: 0.75rem;
	  color: #888;
	}
  
	.expiry-date {
	  color: #aaa;
	}
  
	.item-actions {
	  display: flex;
	  justify-content: flex-end;
	  gap: 0.5rem;
	  padding: 0.5rem 1rem;
	  background-color: #262626;
	  border-top: 1px solid #333;
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
	  width: 100%;
	  border-radius: 0.5rem;
	  margin-bottom: 1rem;
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
  
	.progress-box {
	  background-color: #262626;
	  border-radius: 0.5rem;
	  padding: 1rem;
	  border: 1px solid #333;
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
  </style>