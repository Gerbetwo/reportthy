% Springer Nature Document Class Implementation for Reportthy
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{sn-jnl}[2026/01/01 v1.0 Springer Nature Journal Template]

% Process options
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax

\LoadClass[10pt,a4paper]{article}

\RequirePackage[utf8]{inputenc}
\RequirePackage[T1]{fontenc}
\RequirePackage[margin=2.2cm]{geometry}
\RequirePackage{mathptmx}
\RequirePackage{titlesec}
\RequirePackage{hyperref}

% Configure Hyperref colors for academic Springer style
\hypersetup{
    colorlinks=true,
    linkcolor=black,
    citecolor=black,
    urlcolor=blue
}

% Section formatting
\titleformat{\section}{\large\bfseries\sffamily}{\thesection}{1em}{}
\titleformat{\subsection}{\normalsize\bfseries\sffamily}{\thesubsection}{1em}{}
\titleformat{\subsubsection}{\small\bfseries\sffamily}{\thesubsubsection}{1em}{}

% Macros required by Springer Nature template
\newcommand{\jyear}[1]{\def\@jyear{#1}}
\def\@jyear{}

% Title support: \title[short]{long} or \title{long}
\RenewDocumentCommand{\title}{o m}{%
  \gdef\@title{#2}%
  \IfValueT{#1}{\gdef\@shorttitle{#1}}%
}

% Author & Affiliation handling
\def\@authorlist{}
\def\@affillist{}
\def\@abstracttext{}
\def\@keywordstext{}

% \fnm, \sur, \email
\newcommand{\fnm}[1]{#1}
\newcommand{\sur}[1]{#1}
\newcommand{\email}[1]{\space\texttt{<#1>}}

% \author support: \author*[1]{...} or \author[1]{...} or \author{...}
\RenewDocumentCommand{\author}{s o m}{%
  \g@addto@macro\@authorlist{%
    \begingroup
    #3%
    \IfValueT{#2}{\textsuperscript{#2}}%
    \IfBooleanT{#1}{\textsuperscript{*}}%
    \par\endgroup
  }%
}

% \affil support: \affil*[1]{...} or \affil[1]{...} or \affil{...}
\NewDocumentCommand{\affil}{s o m}{%
  \g@addto@macro\@affillist{%
    \begingroup
    \small\itshape
    \IfValueT{#2}{\textsuperscript{#2}}%
    #3\par
    \endgroup
  }%
}

\newcommand{\orgname}[1]{#1}
\newcommand{\orgaddress}[1]{#1}
\newcommand{\country}[1]{#1}

% \abstract#1
\RenewDocumentCommand{\abstract}{m}{%
  \gdef\@abstracttext{#1}%
}

% \keywords#1
\newcommand{\keywords}[1]{%
  \gdef\@keywordstext{#1}%
}

% Springer Nature \maketitle
\RenewDocumentCommand{\maketitle}{}{%
  \begin{center}%
    {\LARGE\bfseries\sffamily \@title \par}%
    \vskip 1.5em%
    {\large \@authorlist \par}%
    \vskip 0.8em%
    {\@affillist \par}%
    \vskip 1.5em%
  \end{center}%
  \ifx\@abstracttext\@empty\else
    \begin{quote}
      \noindent\textbf{Abstract}\quad \@abstracttext\par
      \ifx\@keywordstext\@empty\else
        \vskip 0.8em
        \noindent\textbf{Keywords:}\quad \@keywordstext\par
      \fi
    \end{quote}
    \vskip 1.5em
  \fi
  \hrule
  \vskip 1.5em
}
