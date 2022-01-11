<script>
	import solver from './wordListManager';
	import Guess from './Guess.svelte';
	const s = solver();
	$: suggestions = [];
	$: guessList = [];
	$: knownLetters = [];
	$: knownPositions = [];
	$: excludedLetters = [];
	$: validResult = false;

	function useSuggestion(s){
		guessList.push(s);
		guessList = guessList;
		suggestions = [];
	}

	function getSuggestions(){
		suggestions = s.bestGuess();
	}
	</script>
	
	<div>
	
	{#each suggestions as suggestion}
		<p>{ suggestion.word } <a href={`https://www.collinsdictionary.com/dictionary/english/${suggestion.word}`} target="_blank">?</a> <button on:click={()=>{useSuggestion(suggestion.word)}}>try this</button></p>
	{/each}
	</div>
	<div>
		<Guess 
			word={guessList[0]}
			bind:excludedLetters={excludedLetters}
			bind:knownLetters={knownLetters}
			bind:knownPositions={knownPositions} />
		[{excludedLetters}], [{knownLetters}], [{knownPositions}]
	</div>
	<button on:click={getSuggestions}>get suggestions</button>
	<style>

	</style>