# Project Backup and Restore Instructions

## Why This is Important

As you work with an AI coding partner, it's crucial to have a safety net. The AI can sometimes make unintended changes or overwrite code unexpectedly. Using a version control system like **Git** allows you to create safe "checkpoints" of your entire project. If any changes are made that you don't like, you can instantly revert the entire codebase back to your last safe checkpoint.

**It is strongly recommended that you follow this process before requesting any significant code changes.**

---

## One-Time Setup

If this is your first time doing this for this project, you need to initialize a Git repository. Open the terminal in your development environment and run this command. You only need to do this once per project.

```bash
git init
```

---

## Step 1: Create a Safe Checkpoint (Do this Before Every Change Request)

Before you ask the AI to modify your code, save a snapshot of your entire project. This ensures you have a clean version to return to if anything goes wrong.

Run these two commands in your terminal:

```bash
# 1. Stage all your current files for the checkpoint
git add .

# 2. Save the checkpoint with a descriptive message
git commit -m "Creating a safe checkpoint before AI changes."
```

You can change the message in the quotes to describe what you're about to do (e.g., `"Checkpoint before adding new feature"`).

Your project code is now saved. You can now safely ask the AI to perform any code modifications.

---

## Step 2: Restore Your Code After an Unwanted Change (Emergency Reset)

If the AI makes a mistake, deletes a feature, or otherwise changes the code in a way you don't want, you can instantly undo **all** of the changes it made and restore your project to your last checkpoint.

Run this single command in the terminal:

```bash
git reset --hard
```

This command will discard all uncommitted changes and revert every file in your project back to the state of your last commit.

**Warning:** This command is powerful and will delete any work done since your last checkpoint. Only use it when you are sure you want to go back.
