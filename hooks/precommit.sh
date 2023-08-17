#!/bin/sh

branch="$(git rev-parse --abbrev-ref HEAD)"

if [ "$branch" = "main" ]; then
  echo "You can't commit directly to main. Make your changes on a branch and raise a Pull Request instead."
  exit 1
fi