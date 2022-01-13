const fullList = require ('./shortWordList.js');

const letters = "abdcefghijklmnopqrstuvwxyz";

function manager(list = fullList){
  const m = {};
  let constraint = [ [...letters],[...letters],[...letters],[...letters],[...letters] ];
  const knownLetters = [];
  const checkedLetters = [];

  function getLetterFrequency(subList, unique=true){
    console.log(`checking letter frequency for ${subList.length} words`);
    return subList.reduce((letters, word)=>{
      let newLetters;
      newLetters = unique ? [...new Set(word.split(''))] : word.split(''); 
      newLetters.forEach(l => {
        if(!letters[l]){ letters[l]=0 }
        letters[l] ++
      });
      return letters;
    }, {});
  }

  function getWordValues(subList, unique=true){ 
    const frequencies = getLetterFrequency(subList);
    console.log(`assigning values to ${subList.length} words`);
    return subList.map(word=>{
      const letters = unique ? [...new Set(word.split(''))] : word.split(''); //unique letters
      const value = letters
        .reduce((acc, letter)=>{
          acc += frequencies[letter];
          return acc;
        }, 0);
      return { word, value }
    })
    .sort((a,b)=>{
      return b.value-a.value;
    });
  }

  m.excludeLetter = function(letterToRemove){
    constraint = constraint.map(possibleLetters=>{
      return possibleLetters.filter(possibleLetter => possibleLetter != letterToRemove);
    })
  }

  m.excludeLetterAtPosition = function(letterToRemove, position){
    constraint[position] = constraint[position].filter(possibleLetter => possibleLetter != letterToRemove);
  }

  m.exclusiveAtPosition = function(letter, position){
    constraint[position] = [letter];
  }

  m.setWordleResult = function(result){     /* result example = [
    {letter:"a", value:"grey"}, //exclude from all positions
    {letter:"b", value:"green"}, // exclude everythign else at this position
    {letter:"c", value:"yellow"}, etc. ] // exclude from this position */
    checkedLetters.push()
    result.forEach((position,i)=>{
      const p = [];
      p[i] = position.letter;
      checkedLetters.push(position.letter);
      switch(position.value){
        case "green":
          m.exclusiveAtPosition(position.letter, i);
          knownLetters.push(position.letter);
          break;
        case "yellow":
          m.excludeLetterAtPosition(position.letter, i);
          knownLetters.push(position.letter); //TODO: deal with double letters
          break;
        case "grey":
          m.excludeLetter(position.letter);
          break;
      }
    });

    return m;
  }

  m.constraint = function(){
    return constraint;
  }

  m.rankedList = function(){
    // filter the list by contraint
    const filteredList = list.filter(word=>{
      // for each letter in the word does it satisfy the constraint for that positions
      for(let i=0; i<word.length; i++){
        if(constraint[i].indexOf(word[i]) < 0){
          return false;
        }
      }
      return true;
    }).filter(word=>{ // remove anythin that doesn't conatain all knownLetters
      return knownLetters.reduce((acc, letter)=>{
        return word.indexOf(letter)>-1 && acc;
      },true);
    })
    // TODO: rank it by letter frequency
    return getWordValues(filteredList);
  };

  m.disjunct = function(){
    const a = new Set(fullList);
    const b = new Set(m.rankedList().map(d=>d.word));
    const difference = [...new Set([...a].filter(x => !b.has(x)))];
    const unchecked = difference.filter(word=>{
      return [...word].reduce((acc, letter)=>{
        return !(checkedLetters.indexOf(letter)>-1) && acc
      },true);
    })
    return getWordValues(unchecked);
  }
  
  return m;
}

module.exports = manager;




/*
const myManager = manager();

// solving a wordle puzzle by straightforward winnowing of the posibility space
myManager.setWordleResult([
  { letter:'a', value:'yellow' },
  { letter:'r', value:'yellow' },
  { letter:'o', value:'yellow' },
  { letter:'s', value:'grey' },
  { letter:'e', value:'grey' }
]).setWordleResult([
  { letter:'m', value:'grey' },
  { letter:'o', value:'yellow' },
  { letter:'l', value:'grey' },
  { letter:'a', value:'yellow' },
  { letter:'r', value:'green'}
]).setWordleResult([
  { letter:'g', value:'grey' },
  { letter:'a', value:'green' },
  { letter:'t', value:'grey' },
  { letter:'o', value:'green' },
  { letter:'r', value:'green' }
]).setWordleResult([
  { letter:'v', value:'yellow' },
  { letter:'a', value:'green' },
  { letter:'p', value:'grey' },
  { letter:'o', value:'green' },
  { letter:'r', value:'green' }
]);

// however, it might be more efficient to broaden the search early on to capture mor information about letters,
// yu can do that like this...
console.log('DISJUNCT ', myManager.disjunct().length, myManager.disjunct());
console.log('POSSIBLES',myManager.rankedList().length, myManager.rankedList());

*/