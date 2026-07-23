export const getFormColor = (result) => {
  switch (result) {
    case 'W':
      return 'form-win'
    case 'L':
      return 'form-loss'
    default:
      return 'form-draw'
  }
}
