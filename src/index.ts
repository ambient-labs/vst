if (import.meta.env.MODE === 'development') {
  import('eruda').then(eruda => eruda.default.init());
}
